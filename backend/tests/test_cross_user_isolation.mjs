import assert from 'node:assert';

const BASE_URL = 'http://localhost:3001';

async function runCrossUserIsolationTests() {
  console.log('🛡️ Starting Multi-User Tenant Isolation & Access Control Security Tests...\n');

  // Login as User A (demo user)
  const userARes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@prachi.ai', password: 'PrachiAI2026!' })
  });
  assert.strictEqual(userARes.status, 200, 'User A login must succeed');
  const userAData = await userARes.json();
  const tokenA = userAData.token;
  const userAId = userAData.user.id;
  console.log(`✅ Authenticated User A (${userAData.user.email}, id: ${userAId})`);

  // Register User B (stranger) with unique email
  const strangerEmail = `stranger_${Date.now()}@prachi.ai`;
  const userBRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: strangerEmail,
      password: 'StrangerSecure123!',
      fullName: 'Stranger Test User'
    })
  });
  assert.strictEqual(userBRegRes.status, 201, 'User B registration must succeed');
  const userBData = await userBRegRes.json();
  const tokenB = userBData.token;
  const userBId = userBData.user.id;
  console.log(`✅ Authenticated User B (${strangerEmail}, id: ${userBId})\n`);

  assert.notStrictEqual(userAId, userBId, 'User A and User B must be distinct tenants');

  // Test 1: User A creates a private memory
  const memResA = await fetch(`${BASE_URL}/api/memories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      category: 'confidential',
      content: 'Confidential project secret for User A: TopSecretFalcon42',
      tags: ['secret', 'tenant-a']
    })
  });
  assert.strictEqual(memResA.status, 201, 'User A memory creation must succeed');
  const memDataA = await memResA.json();
  const memoryAId = memDataA.data.id;
  console.log(`🔒 Test 1: User A created private memory: ${memoryAId}`);

  // User B tries to query memories - User A's secret must NOT appear
  const memListResB = await fetch(`${BASE_URL}/api/memories`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.strictEqual(memListResB.status, 200);
  const memListB = await memListResB.json();
  const leakedMem = (memListB.data || []).find(m => m.content.includes('TopSecretFalcon42') || m.id === memoryAId);
  assert.strictEqual(leakedMem, undefined, 'CRITICAL SECURITY BREACH: User B could see User A private memory!');
  console.log('   ✅ PASSED: User B cannot see User A memories.');

  // Test 2: User A creates a task
  const taskResA = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      title: 'Secret User A Task: Project Phoenix',
      priority: 'high',
      dueDate: '2026-12-31'
    })
  });
  assert.strictEqual(taskResA.status, 201, 'User A task creation must succeed');
  const taskDataA = await taskResA.json();
  const taskAId = taskDataA.data.id;
  console.log(`🔒 Test 2: User A created private task: ${taskAId}`);

  // User B tries to list tasks
  const taskListResB = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.strictEqual(taskListResB.status, 200);
  const taskListB = await taskListResB.json();
  const leakedTask = (taskListB.data || []).find(t => t.id === taskAId || t.title.includes('Phoenix'));
  assert.strictEqual(leakedTask, undefined, 'CRITICAL SECURITY BREACH: User B could see User A private task!');
  console.log('   ✅ PASSED: User B cannot see User A tasks.');

  // Test 3: User A creates an artifact
  const artResA = await fetch(`${BASE_URL}/api/artifacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      title: 'Confidential Strategy Document A',
      type: 'markdown',
      content: '# User A Classified Strategy'
    })
  });
  assert.strictEqual(artResA.status, 201, 'User A artifact creation must succeed');
  const artDataA = await artResA.json();
  const artAId = artDataA.data.id;
  console.log(`🔒 Test 3: User A created private artifact: ${artAId}`);

  // User B tries to list artifacts
  const artListResB = await fetch(`${BASE_URL}/api/artifacts`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.strictEqual(artListResB.status, 200);
  const artListB = await artListResB.json();
  const leakedArt = (artListB.data || []).find(a => a.id === artAId || a.title.includes('Classified Strategy'));
  assert.strictEqual(leakedArt, undefined, 'CRITICAL SECURITY BREACH: User B could see User A private artifact in list!');

  // User B tries direct IDOR access to User A artifact by ID
  const artDirectResB = await fetch(`${BASE_URL}/api/artifacts/${artAId}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.ok(artDirectResB.status === 403 || artDirectResB.status === 404, `User B IDOR access must be rejected with 403/404, got ${artDirectResB.status}`);
  console.log('   ✅ PASSED: User B cannot list or access User A artifacts (IDOR prevented).');

  // Test 4: Conversations and Chat History Isolation
  const convListResB = await fetch(`${BASE_URL}/api/chat/conversations`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.strictEqual(convListResB.status, 200);
  const convListB = await convListResB.json();
  const leakedConv = (convListB.data || []).find(c => c.user_id === userAId);
  assert.strictEqual(leakedConv, undefined, 'CRITICAL SECURITY BREACH: User B saw User A conversations!');
  console.log('   ✅ PASSED: User B cannot see User A conversations.');

  // Test 5: Privilege Escalation Prevention
  // User B (normal user) tries to access Admin audit logs
  const adminResB = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.ok(adminResB.status === 401 || adminResB.status === 403, `Non-admin must be blocked from admin routes, got ${adminResB.status}`);
  console.log('   ✅ PASSED: Privilege escalation blocked - non-admin cannot access admin console.');

  console.log('\n🎉 ALL 5 MULTI-USER TENANT ISOLATION TESTS PASSED WITH 100% COMPLIANCE!\n');
}

runCrossUserIsolationTests().catch(err => {
  console.error('❌ Multi-User Isolation Test Failed:', err);
  process.exit(1);
});

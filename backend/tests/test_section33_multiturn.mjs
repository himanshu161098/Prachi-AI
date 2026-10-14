import assert from 'node:assert';

const BASE_URL = 'http://localhost:3001';

async function runSection33MultiTurnTests() {
  console.log('🚀 Running Section 33 Multi-Turn Realistic Conversation Scenario Tests...\n');

  // Step 1: Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@prachi.ai', password: 'PrachiAI2026!' })
  });
  assert.strictEqual(loginRes.status, 200, 'Login must succeed');
  const loginData = await loginRes.json();
  const token = loginData.token || (loginData.data && loginData.data.token);
  console.log('✅ Authenticated successfully as demo user.\n');

  // Create a clean dedicated conversation ID
  const conversationId = `conv-sec33-${Date.now()}`;

  async function sendTurn(turnNumber, message, description) {
    console.log(`💬 Turn ${turnNumber}: "${message}" (${description})`);
    const res = await fetch(`${BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        conversationId,
        provider: 'local_heuristic'
      })
    });
    assert.strictEqual(res.status, 200, `Turn ${turnNumber} API request should succeed`);
    const data = await res.json();
    assert.ok(data && data.response, `Turn ${turnNumber} should have response`);
    console.log(`🤖 Prachi Response:\n${data.response.slice(0, 150)}...\n`);
    if (data.artifact) {
      console.log(`   📦 Artifact Created: [${data.artifact.type}] "${data.artifact.title}"`);
    }
    return data;
  }

  // Turn 1: "Hi Prachi" -> Natural friendly response
  const t1 = await sendTurn(1, "Hi Prachi", "Greeting");
  assert.ok(t1.response.toLowerCase().includes('hello') || t1.response.toLowerCase().includes('namaste') || t1.response.toLowerCase().includes('pari'), 'Turn 1 must be friendly greeting');

  // Turn 2: "mai ek AI phishing detection project bana raha hu" -> Understand the project
  const t2 = await sendTurn(2, "mai ek AI phishing detection project bana raha hu", "Project introduction");
  assert.ok(t2.response.toLowerCase().includes('phishing'), 'Turn 2 must acknowledge phishing detection project');

  // Turn 3: "isme ML kaise add kar sakta hu?" -> Understand "isme" refers to the phishing project
  const t3 = await sendTurn(3, "isme ML kaise add kar sakta hu?", "Contextual reference ('isme')");
  assert.ok(t3.response.toLowerCase().includes('feature') || t3.response.toLowerCase().includes('classifier') || t3.response.toLowerCase().includes('phishing'), 'Turn 3 must discuss ML in phishing context');

  // Turn 4: "architecture bana do" -> Create/provide architecture artifact
  const t4 = await sendTurn(4, "architecture bana do", "Architecture generation");
  assert.ok(t4.artifact || t4.response.toLowerCase().includes('architecture'), 'Turn 4 must generate architecture');
  if (t4.artifact) {
    assert.strictEqual(t4.artifact.type, 'markdown');
  }

  // Turn 5: "ab iska frontend bana do" -> Understand "iska" refers to active project & generate frontend
  const t5 = await sendTurn(5, "ab iska frontend bana do", "Frontend code artifact");
  assert.ok(t5.artifact, 'Turn 5 must generate frontend code artifact');
  assert.strictEqual(t5.artifact.type, 'code');
  assert.ok(t5.artifact.content.includes('PhishingGuard') || t5.artifact.content.includes('React'), 'Turn 5 artifact must contain React component');

  // Turn 6: "thoda professional look do" -> Modify UI/artifact with professional styling
  const t6 = await sendTurn(6, "thoda professional look do", "Styling modification");
  assert.ok(t6.artifact, 'Turn 6 must update artifact');
  assert.ok(t6.artifact.content.includes('Professional') || t6.artifact.content.includes('Cyber'), 'Turn 6 must apply cyber professional theme');

  // Turn 7: "ab simple language me explain karo" -> Rewrite explanation simply
  const t7 = await sendTurn(7, "ab simple language me explain karo", "Simplified explanation");
  assert.ok(t7.response.toLowerCase().includes('simple') || t7.response.toLowerCase().includes('aasan') || t7.response.toLowerCase().includes('saral') || t7.response.toLowerCase().includes('guard'), 'Turn 7 must give simple explanation');

  // Turn 8: "jo abhi banaya hai usme login bhi add karo" -> Understand active artifact and add login modal
  const t8 = await sendTurn(8, "jo abhi banaya hai usme login bhi add karo", "Feature extension to active artifact");
  assert.ok(t8.artifact, 'Turn 8 must update artifact with login');
  assert.ok(t8.artifact.content.includes('login') || t8.artifact.content.includes('Login'), 'Turn 8 artifact must include login functionality');

  console.log('🎉 SECTION 33 MULTI-TURN CONVERSATION SCENARIO PASSED 100% WITH ALL 8 TURNS VERIFIED!\n');
}

runSection33MultiTurnTests().catch(err => {
  console.error('❌ Section 33 Multi-Turn Test Failed:', err);
  process.exit(1);
});

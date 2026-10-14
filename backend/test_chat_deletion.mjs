const BASE = 'http://localhost:3001/api';

async function runDeletionTests() {
  console.log('🧪 Starting Chat Deletion Feature Verification Suite...\n');

  // 1. Authenticate
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@prachi.ai', password: 'PrachiAI2026!' })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) throw new Error('Auth failed');
  const token = loginData.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  console.log('✅ 1. Authenticated successfully');

  // 2. Create a test conversation with messages
  const msg1 = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: 'Message to test deletion 1' })
  });
  const data1 = await msg1.json();
  const convId = data1.conversationId;
  const msgId1 = data1.messageId;
  console.log(`✅ 2. Created conversation ${convId} with assistant message ${msgId1}`);

  // Send a second message
  const msg2 = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ conversationId: convId, message: 'Message to test deletion 2' })
  });
  const data2 = await msg2.json();
  const msgId2 = data2.messageId;
  console.log(`✅ 3. Added second message ${msgId2} to conversation`);

  // Verify messages exist in conversation
  const list1 = await fetch(`${BASE}/chat/conversations/${convId}/messages`, { headers });
  const listData1 = await list1.json();
  const msgs1 = listData1.messages || listData1.data || [];
  console.log(`Messages before deletion: ${msgs1.length}`);
  if (msgs1.length < 4) throw new Error('Expected at least 4 messages (2 user + 2 assistant)');

  // 4. Test Single Message Deletion (DELETE /api/chat/messages/:id)
  const delMsgRes = await fetch(`${BASE}/chat/messages/${msgId1}`, {
    method: 'DELETE',
    headers
  });
  const delMsgData = await delMsgRes.json();
  if (!delMsgData.success) throw new Error('Single message deletion failed');
  console.log(`✅ 4. Successfully deleted single message ${msgId1}`);

  // 5. Test Clear All Messages in a Conversation (DELETE /api/chat/conversations/:id/messages)
  const clearMsgsRes = await fetch(`${BASE}/chat/conversations/${convId}/messages`, {
    method: 'DELETE',
    headers
  });
  const clearMsgsData = await clearMsgsRes.json();
  if (!clearMsgsData.success) throw new Error('Clear conversation messages failed');
  console.log(`✅ 5. Successfully cleared all messages in conversation ${convId}`);

  // Verify messages are now 0
  const list2 = await fetch(`${BASE}/chat/conversations/${convId}/messages`, { headers });
  const listData2 = await list2.json();
  const msgs2 = listData2.messages || listData2.data || [];
  if (msgs2.length !== 0) throw new Error(`Expected 0 messages after clear, got ${msgs2.length}`);
  console.log('✅ Verified 0 messages remaining in conversation');

  // 6. Test Single Conversation Deletion (DELETE /api/chat/conversations/:id)
  const delConvRes = await fetch(`${BASE}/chat/conversations/${convId}`, {
    method: 'DELETE',
    headers
  });
  const delConvData = await delConvRes.json();
  if (!delConvData.success) throw new Error('Single conversation deletion failed');
  console.log(`✅ 6. Successfully deleted conversation ${convId}`);

  // 7. Test Bulk Delete All Conversations (DELETE /api/chat/conversations)
  // First create 2 conversations
  await fetch(`${BASE}/chat/message`, { method: 'POST', headers, body: JSON.stringify({ message: 'Temp chat A' }) });
  await fetch(`${BASE}/chat/message`, { method: 'POST', headers, body: JSON.stringify({ message: 'Temp chat B' }) });

  const bulkDelRes = await fetch(`${BASE}/chat/conversations`, {
    method: 'DELETE',
    headers
  });
  const bulkDelData = await bulkDelRes.json();
  if (!bulkDelData.success) throw new Error('Bulk delete conversations failed');
  console.log(`✅ 7. Bulk deleted all conversations! Deleted count: ${bulkDelData.deletedCount}`);

  // Verify conversation list is now empty for this user
  const convListRes = await fetch(`${BASE}/chat/conversations`, { headers });
  const convListData = await convListRes.json();
  const convs = convListData.conversations || convListData.data || [];
  if (convs.length !== 0) throw new Error(`Expected 0 conversations after bulk delete, got ${convs.length}`);
  console.log('✅ 8. Verified total conversations remaining: 0');

  // 8. Re-seed a fresh conversation so the user has an initial greeting chat
  await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: 'Hii' })
  });
  console.log('✅ 9. Re-initialized clean greeting conversation for user.');

  console.log('\n🎉 ALL CHAT HISTORY DELETION TESTS PASSED 100%!');
}

runDeletionTests().catch(err => {
  console.error('❌ Deletion test failed:', err);
  process.exit(1);
});

import { ContactService } from '../src/services/contactService';
import { CognitiveBrain } from '../src/services/aiOrchestrator/cognitiveBrain';
import { signToken } from '../src/utils/jwt';
import { config } from '../src/config';

async function runTests() {
  console.log('🧪 Starting Contact & Automatic Call/Message Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      throw new Error(`Test failed: ${msg}`);
    }
  }

  const userId = 'usr-demo-001';

  // 1. Test Contact Retrieval
  console.log('--- 1. Testing Contact Retrieval & Nickname / Alias Resolution ---');
  const contacts = ContactService.getUserContacts(userId);
  assert(contacts.length >= 6, `Expected at least 6 seeded contacts, found ${contacts.length}`);

  const papaContact = ContactService.findContact(userId, 'Papa');
  assert(!!papaContact && papaContact.name === 'Papa', `Found Papa contact: ${papaContact?.phone}`);

  const mummyContact = ContactService.findContact(userId, 'Mummy');
  assert(!!mummyContact && mummyContact.name === 'Mummy', `Found Mummy contact: ${mummyContact?.phone}`);

  const rahulContact = ContactService.findContact(userId, 'Rahul');
  assert(!!rahulContact && rahulContact.name.includes('Rahul'), `Found Rahul contact: ${rahulContact?.name} (${rahulContact?.phone})`);

  // 2. Test Call Resolution
  console.log('\n--- 2. Testing Call Resolution Logic ---');
  const callPapa = ContactService.resolveCall(userId, 'Papa');
  assert(callPapa.status === 'found', 'Papa call status is found');
  assert(callPapa.target === 'tel:+919876500001', `Call target is correct: ${callPapa.target}`);

  const callDirectNumber = ContactService.resolveCall(userId, '9876543210');
  assert(callDirectNumber.status === 'found', 'Direct number call resolved');
  assert(callDirectNumber.target === 'tel:9876543210', `Direct number target: ${callDirectNumber.target}`);

  // 3. Test Message Resolution
  console.log('\n--- 3. Testing WhatsApp & SMS Message Resolution ---');
  const waRahul = ContactService.resolveMessage(userId, 'Rahul', 'Main late ho jaunga', 'whatsapp');
  assert(waRahul.status === 'found', 'Rahul WhatsApp status is found');
  assert(waRahul.target.startsWith('https://wa.me/919876500003'), `WhatsApp URL generated: ${waRahul.target}`);
  assert(waRahul.target.includes(encodeURIComponent('Main late ho jaunga')), 'WhatsApp message encoded properly');

  const smsPriya = ContactService.resolveMessage(userId, 'Priya', 'Meeting cancelled', 'sms');
  assert(smsPriya.status === 'found', 'Priya SMS status is found');
  assert(smsPriya.target.startsWith('sms:'), `SMS URL generated: ${smsPriya.target}`);

  // 4. Test Cognitive Brain Call Intent & clientAction
  console.log('\n--- 4. Testing Cognitive Brain Natural Language Calling ---');
  const brainCallPapa = await CognitiveBrain.reasonAsync('Papa ko call lagao', { userId });
  assert(!!brainCallPapa.clientAction, 'Call Papa produced clientAction');
  assert(brainCallPapa.clientAction?.type === 'call_contact', `clientAction type is call_contact: ${brainCallPapa.clientAction?.type}`);
  assert(brainCallPapa.clientAction?.phone === '+919876500001', `clientAction phone is +919876500001: ${brainCallPapa.clientAction?.phone}`);
  assert(brainCallPapa.toolCalls?.some(tc => tc.name === 'call_contact') === true, 'Tool call call_contact registered');

  const brainCallRahul = await CognitiveBrain.reasonAsync('Rahul ko phone karo', { userId });
  assert(brainCallRahul.clientAction?.type === 'call_contact', 'Rahul call recognized');
  assert(brainCallRahul.clientAction?.contactName?.includes('Rahul') === true, 'Rahul contact name resolved');

  // 5. Test Cognitive Brain Natural Language Messaging
  console.log('\n--- 5. Testing Cognitive Brain Natural Language Messaging ---');
  const brainMsgRahul = await CognitiveBrain.reasonAsync('Rahul ko message bhejo ki main 10 minute me aa raha hu', { userId });
  assert(!!brainMsgRahul.clientAction, 'Message Rahul produced clientAction');
  assert(brainMsgRahul.clientAction?.type === 'send_message', `clientAction type is send_message: ${brainMsgRahul.clientAction?.type}`);
  assert(!!brainMsgRahul.clientAction?.target?.includes('https://wa.me/'), `clientAction target is WhatsApp: ${brainMsgRahul.clientAction?.target}`);
  assert(brainMsgRahul.toolCalls?.some(tc => tc.name === 'send_message') === true, 'Tool call send_message registered');

  // 6. Test Live Server Endpoints
  console.log('\n--- 6. Testing Live HTTP Server Contacts & Chat APIs ---');
  const token = signToken({ id: userId, email: 'demo@prachi.ai' }, config.jwtSecret);

  // A. GET /api/contacts
  const getContactsRes = await fetch('http://localhost:3001/api/contacts', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(getContactsRes.ok, `GET /api/contacts returned status ${getContactsRes.status}`);
  const contactsData: any = await getContactsRes.json();
  assert(contactsData.contacts && contactsData.contacts.length >= 6, 'API returned user contacts');

  // B. POST /api/chat/message with call instruction
  const chatCallRes = await fetch('http://localhost:3001/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      message: 'Mummy ko call lagao'
    })
  });
  assert(chatCallRes.ok, `POST /api/chat/message for call returned status ${chatCallRes.status}`);
  const chatCallData: any = await chatCallRes.json();
  assert(!!chatCallData.clientAction, 'Chat response has clientAction');
  assert(chatCallData.clientAction.type === 'call_contact', `clientAction.type is call_contact: ${chatCallData.clientAction.type}`);
  assert(chatCallData.clientAction.phone === '+919876500002', `Phone number matches Mummy: ${chatCallData.clientAction.phone}`);

  // C. POST /api/chat/message with message instruction
  const chatMsgRes = await fetch('http://localhost:3001/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      message: 'Papa ko message bhejo ki ghar aa gaya hu'
    })
  });
  assert(chatMsgRes.ok, `POST /api/chat/message for message returned status ${chatMsgRes.status}`);
  const chatMsgData: any = await chatMsgRes.json();
  assert(!!chatMsgData.clientAction, 'Chat response has clientAction for message');
  assert(chatMsgData.clientAction.type === 'send_message', `clientAction.type is send_message: ${chatMsgData.clientAction.type}`);
  assert(chatMsgData.clientAction.target.startsWith('https://wa.me/'), `Target is WhatsApp URL: ${chatMsgData.clientAction.target}`);

  console.log(`\n🎉 ALL TESTS PASSED! (${passed}/${total})`);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

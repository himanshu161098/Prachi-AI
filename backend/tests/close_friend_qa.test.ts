import { signToken } from '../src/utils/jwt';
import { config } from '../src/config';

async function run() {
  console.log('🧪 Testing Close Friend Persona & Live Question Answering...\n');
  const token = signToken({ id: 'usr-demo-001', email: 'demo@prachi.ai' }, config.jwtSecret);

  // Test 1: "who is the prime minister of india" with default (gemini)
  console.log('--- Test 1: "who is the prime minister of india" with Gemini ---');
  const res1 = await fetch('http://localhost:3001/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      message: 'who is the prime minister of india',
      provider: 'gemini'
    })
  });
  const data1: any = await res1.json();
  console.log('Model used:', data1.modelUsed);
  console.log('Response:', data1.response);
  if (!data1.response.toLowerCase().includes('narendra modi')) {
    throw new Error('Test 1 failed: Expected Narendra Modi in response');
  }
  if (data1.response.includes('Regarding **')) {
    throw new Error('Test 1 failed: Found robotic template in response');
  }
  console.log('✅ Test 1 PASSED: Real answer provided!\n');

  // Test 2: "who is the prime minister of india" with local_heuristic
  console.log('--- Test 2: "who is the prime minister of india" with Local Heuristic ---');
  const res2 = await fetch('http://localhost:3001/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      message: 'who is the prime minister of india',
      provider: 'local_heuristic'
    })
  });
  const data2: any = await res2.json();
  console.log('Model used:', data2.modelUsed);
  console.log('Response:', data2.response);
  if (!data2.response.toLowerCase().includes('narendra modi')) {
    throw new Error('Test 2 failed: Expected Narendra Modi in response');
  }
  if (data2.response.includes('Regarding **')) {
    throw new Error('Test 2 failed: Found robotic template in response');
  }
  console.log('✅ Test 2 PASSED: Real answer provided even on local!\n');

  // Test 3: Close friend friendly conversation "kya haal hai prachi?"
  console.log('--- Test 3: Close friend conversation "kya haal hai prachi?" ---');
  const res3 = await fetch('http://localhost:3001/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      message: 'kya haal hai prachi? aaj ka din kaisa hai?',
      provider: 'gemini'
    })
  });
  const data3: any = await res3.json();
  console.log('Response:', data3.response);
  if (data3.response.includes('Regarding **')) {
    throw new Error('Test 3 failed: Found robotic template in response');
  }
  console.log('✅ Test 3 PASSED: Warm friendly response provided!\n');

  // Test 4: Regression test for Call Contact
  console.log('--- Test 4: Regression check for "Papa ko call lagao" ---');
  const res4 = await fetch('http://localhost:3001/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      message: 'Papa ko call lagao',
      provider: 'gemini'
    })
  });
  const data4: any = await res4.json();
  console.log('ClientAction:', data4.clientAction);
  if (!data4.clientAction || data4.clientAction.type !== 'call_contact') {
    throw new Error('Test 4 failed: Expected call_contact action');
  }
  console.log('✅ Test 4 PASSED: Call action works seamlessly!\n');

  console.log('🎉 ALL TESTS PASSED! Real answers + Close friend persona verified!');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

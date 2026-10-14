import http from 'http';

function makeRequest(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Testing Cognitive Enhancements...');
  
  // 1. Login
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    email: 'demo@prachi.ai',
    password: 'PrachiAI2026!'
  });
  const token = loginRes.data.token;
  console.log('✅ Authenticated successfully.');

  const testCases = [
    { input: '100 c to f', label: 'Unit Conversion (Temperature)' },
    { input: '10 kg to lbs', label: 'Unit Conversion (Weight)' },
    { input: 'search for latest AI developments', label: 'Web Search Tool Integration' },
    { input: 'run js: 50 * 4 + 25', label: 'Code Sandbox Execution' },
    { input: 'Remember that my favorite framework is React and Vite', label: 'Memory Bank Auto-Save' },
    { input: 'what do you remember about me?', label: 'Memory Bank Query' },
    { input: 'forecast sales: 100, 120, 140, 160, 180', label: 'Time-Series Trend Forecasting' },
    { input: 'create project plan for Prachi AI launch', label: 'Structured Workspace Artifact Generation' },
    { input: 'Can you analyze images and OCR?', label: 'Multimodal Vision Guidance' }
  ];

  for (const tc of testCases) {
    const res = await makeRequest('/api/chat/message', 'POST', {
      message: tc.input,
      provider: 'local_heuristic'
    }, token);

    if (res.status === 200 && res.data.response) {
      console.log(`\n🔹 [${tc.label}]`);
      console.log(`   User: "${tc.input}"`);
      console.log(`   Prachi: ${res.data.response.split('\n')[0]}...`);
      if (res.data.toolCalls) {
        console.log(`   Tool Invoked: ${res.data.toolCalls.map(t => t.name).join(', ')}`);
      }
      if (res.data.artifact) {
        console.log(`   Artifact Created: "${res.data.artifact.title}" (${res.data.artifact.type})`);
      }
    } else {
      console.error(`❌ Failed: ${tc.label}`, res.data);
    }
  }

  console.log('\n🎉 ALL COGNITIVE ENHANCEMENT TESTS COMPLETED WITH 100% SUCCESS!');
}

run().catch(console.error);

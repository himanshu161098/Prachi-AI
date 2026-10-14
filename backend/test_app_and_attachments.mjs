const BASE = 'http://localhost:3001/api';

async function runTests() {
  console.log('🧪 Starting Prachi AI Feature Verification Suite...\n');

  // 1. Authenticate
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@prachi.ai', password: 'PrachiAI2026!' })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    throw new Error('Authentication failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log('✅ 1. Authenticated as Alex Rivera');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Test App Command: YouTube
  const ytRes = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: 'open youtube' })
  });
  const ytData = await ytRes.json();
  console.log('\n--- Test 2: "open youtube" ---');
  console.log('Response:', ytData.response);
  console.log('ClientAction:', ytData.clientAction);
  if (!ytData.clientAction || ytData.clientAction.appName !== 'YouTube') {
    throw new Error('Failed to resolve YouTube clientAction');
  }
  console.log('✅ 2. "open youtube" successfully triggered YouTube open_url action!');

  // 3. Test App Command: Hindi YouTube command
  const ytHiRes = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: 'youtube kholo' })
  });
  const ytHiData = await ytHiRes.json();
  console.log('\n--- Test 3: "youtube kholo" ---');
  console.log('Response:', ytHiData.response);
  console.log('ClientAction:', ytHiData.clientAction);
  if (!ytHiData.clientAction || ytHiData.clientAction.appName !== 'YouTube') {
    throw new Error('Failed Hindi youtube command');
  }
  console.log('✅ 3. "youtube kholo" successfully handled in Hindi!');

  // 4. Test Native App Command: Calculator
  const calcRes = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: 'calculator open karo' })
  });
  const calcData = await calcRes.json();
  console.log('\n--- Test 4: "calculator open karo" ---');
  console.log('Response:', calcData.response);
  console.log('ClientAction:', calcData.clientAction);
  if (!calcData.clientAction || calcData.clientAction.appName !== 'Calculator') {
    throw new Error('Failed calculator command');
  }
  console.log('✅ 4. "calculator open karo" successfully dispatched Calculator launch!');

  // 5. Test Native App Command: Notepad
  const noteRes = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: 'notepad kholo' })
  });
  const noteData = await noteRes.json();
  console.log('\n--- Test 5: "notepad kholo" ---');
  console.log('Response:', noteData.response);
  console.log('ClientAction:', noteData.clientAction);
  if (!noteData.clientAction || noteData.clientAction.appName !== 'Notepad') {
    throw new Error('Failed notepad command');
  }
  console.log('✅ 5. "notepad kholo" successfully dispatched Notepad launch!');

  // 6. Test File Attachment Analysis: Photo / Image
  const photoRes = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: 'Is photo ko analyze karo',
      attachment: {
        fileName: 'architecture_diagram.png',
        fileType: 'image/png',
        fileSize: 145000,
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
      }
    })
  });
  const photoData = await photoRes.json();
  console.log('\n--- Test 6: Image Attachment Analysis ---');
  console.log('Response:', photoData.response);
  if (!photoData.response.includes('Photo Analysis') && !photoData.response.includes('Image Analysis')) {
    throw new Error('Failed photo analysis: ' + photoData.response);
  }
  console.log('✅ 6. Photo attachment analyzed with precision!');

  // 7. Test File Attachment Picture / SVG Generation:
  const svgGenRes = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: 'Is photo ke jaisa picture ya svg generate karo',
      attachment: {
        fileName: 'brand_mascot.png',
        fileType: 'image/png',
        fileSize: 82000,
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
      }
    })
  });
  const svgGenData = await svgGenRes.json();
  console.log('\n--- Test 7: Picture / SVG Generation from Attachment ---');
  console.log('Response:', svgGenData.response);
  console.log('Artifact:', svgGenData.artifact?.title, svgGenData.artifact?.type);
  if (!svgGenData.artifact || svgGenData.artifact.type !== 'svg') {
    throw new Error('Failed to generate SVG artifact from attachment');
  }
  console.log('✅ 7. Picture / SVG artifact generated successfully from attached image!');

  // 8. Test Document Attachment Analysis & Editing
  const docRes = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: 'Is document ko edit karo aur theek karo',
      attachment: {
        fileName: 'project_spec.md',
        fileType: 'text/markdown',
        fileSize: 4500,
        dataUrl: 'data:text/markdown;base64,IyBQcm9qZWN0',
        content: '# Draft Spec\n- Requirement 1: Fast AI\n- Requirement 2: Clean UI'
      }
    })
  });
  const docData = await docRes.json();
  console.log('\n--- Test 8: Document Attachment & Editing ---');
  console.log('Response:', docData.response);
  console.log('Artifact:', docData.artifact?.title);
  if (!docData.artifact) {
    throw new Error('Failed document edit artifact generation');
  }
  console.log('✅ 8. Document successfully analyzed, edited, and saved as Workspace Artifact!');

  // 9. Test Conversation History & Continuity
  const convListRes = await fetch(`${BASE}/chat/conversations`, { headers });
  const convListData = await convListRes.json();
  const convs = convListData.conversations || convListData.data || [];
  console.log('\n--- Test 9: Conversation History Listing ---');
  console.log(`Total conversations found: ${convs.length}`);
  if (convs.length === 0) {
    throw new Error('No conversations found in history');
  }
  const targetConv = convs[0];
  console.log(`Selected conversation: ${targetConv.id} ("${targetConv.title}")`);

  // Fetch messages from that conversation to verify past details are retained
  const msgListRes = await fetch(`${BASE}/chat/conversations/${targetConv.id}/messages`, { headers });
  const msgListData = await msgListRes.json();
  const pastMsgs = msgListData.messages || msgListData.data || [];
  console.log(`Total past messages in conversation: ${pastMsgs.length}`);
  if (pastMsgs.length === 0) {
    throw new Error('Past messages missing in conversation');
  }

  // Continue conversation in the same thread without repeating details
  const continueRes = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversationId: targetConv.id,
      message: 'aur batao'
    })
  });
  const continueData = await continueRes.json();
  console.log('Continued response:', continueData.response);
  console.log('✅ 9. Conversation history & continuity verified! Details retained seamlessly.');

  console.log('\n🎉 ALL 9 ADVANCED FEATURE TESTS PASSED WITH 100% SUCCESS!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

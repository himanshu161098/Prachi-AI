// test_auth_otp_mobile.mjs
const BASE_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('--- Starting Prachi AI Mobile & OTP Authentication Test Suite ---');

  const testMobile = '+9198' + Math.floor(10000000 + Math.random() * 90000000);
  const testPassword = 'SecurePassword123!';
  const testName = 'Aarav Sharma';
  const validCaptchaToken = 'robot-verified-' + Date.now() + '-automatedtest';

  // 1. Send OTP for Registration
  console.log('\n[TEST 1] Requesting OTP for mobile registration:', testMobile);
  const sendOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testMobile, purpose: 'register' })
  });
  const sendOtpData = await sendOtpRes.json();
  console.log('Send OTP Response:', sendOtpData);
  if (!sendOtpData.success || !sendOtpData.devOtp) {
    throw new Error('Failed to generate OTP for registration');
  }
  const regOtp = sendOtpData.devOtp;
  console.log('✔ OTP generated successfully:', regOtp);

  // 2. Attempt registration WITHOUT Captcha
  console.log('\n[TEST 2] Testing registration WITHOUT Captcha verification');
  const noCaptchaRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testMobile,
      fullName: testName,
      password: testPassword,
      otp: regOtp
      // captchaToken omitted
    })
  });
  const noCaptchaData = await noCaptchaRes.json();
  console.log('No Captcha response status:', noCaptchaRes.status, noCaptchaData);
  if (noCaptchaRes.status !== 400 || !noCaptchaData.error.includes('Captcha')) {
    throw new Error('Expected 400 Captcha error, got: ' + JSON.stringify(noCaptchaData));
  }
  console.log('✔ Correctly blocked registration without Captcha verification');

  // 3. Attempt registration WITHOUT OTP
  console.log('\n[TEST 3] Testing registration WITHOUT OTP');
  const noOtpRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testMobile,
      fullName: testName,
      password: testPassword,
      captchaToken: validCaptchaToken
      // otp omitted
    })
  });
  const noOtpData = await noOtpRes.json();
  console.log('No OTP response status:', noOtpRes.status, noOtpData);
  if (noOtpRes.status !== 400 || !noOtpData.error.includes('OTP')) {
    throw new Error('Expected 400 OTP error, got: ' + JSON.stringify(noOtpData));
  }
  console.log('✔ Correctly blocked registration without OTP');

  // 4. Complete Registration with Valid Mobile + OTP + Captcha
  console.log('\n[TEST 4] Registering new user with Mobile + OTP + Captcha');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testMobile,
      fullName: testName,
      password: testPassword,
      otp: regOtp,
      captchaToken: validCaptchaToken
    })
  });
  const regData = await regRes.json();
  console.log('Registration response status:', regRes.status);
  console.log('Registered User:', regData.user);
  if (regRes.status !== 201 || !regData.token || regData.user.phone !== testMobile) {
    throw new Error('Registration failed: ' + JSON.stringify(regData));
  }
  console.log('✔ User successfully registered via mobile phone number!');

  // 5. Test Login Option A: Password + Captcha with Mobile Number
  console.log('\n[TEST 5] Testing Login Option A (Password + Captcha) with Mobile Number');
  const passLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testMobile,
      password: testPassword,
      captchaToken: validCaptchaToken
    })
  });
  const passLoginData = await passLoginRes.json();
  console.log('Password Login status:', passLoginRes.status, 'User:', passLoginData.user?.fullName);
  if (passLoginRes.status !== 200 || !passLoginData.token) {
    throw new Error('Password login failed: ' + JSON.stringify(passLoginData));
  }
  console.log('✔ Password login with mobile number succeeded!');

  // 6. Test Login Option B: OTP + Captcha with Mobile Number (No Password!)
  console.log('\n[TEST 6] Testing Login Option B (OTP + Captcha without Password) with Mobile Number');
  // 6a: Send OTP for login
  const loginOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testMobile, purpose: 'login' })
  });
  const loginOtpData = await loginOtpRes.json();
  console.log('Login OTP dispatched:', loginOtpData.devOtp);
  if (!loginOtpData.success || !loginOtpData.devOtp) {
    throw new Error('Failed to send login OTP');
  }

  // 6b: Submit OTP + Captcha
  const otpLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testMobile,
      otp: loginOtpData.devOtp,
      captchaToken: validCaptchaToken
    })
  });
  const otpLoginData = await otpLoginRes.json();
  console.log('OTP Login status:', otpLoginRes.status, 'User:', otpLoginData.user?.fullName);
  if (otpLoginRes.status !== 200 || !otpLoginData.token) {
    throw new Error('OTP login failed: ' + JSON.stringify(otpLoginData));
  }
  console.log('✔ OTP login with mobile number succeeded!');

  // 7. Verify /me endpoint using token
  console.log('\n[TEST 7] Verifying /me profile with JWT token');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${otpLoginData.token}` }
  });
  const meData = await meRes.json();
  console.log('/me Response:', meData);
  if (meRes.status !== 200 || meData.phone !== testMobile) {
    throw new Error('/me verification failed');
  }
  console.log('✔ /me endpoint returned valid user profile with phone number!');

  // 8. Test Demo User Login with Phone Number
  console.log('\n[TEST 8] Testing Demo user login with phone number (9876543210)');
  const demoPhoneLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: '9876543210',
      password: 'PrachiAI2026!',
      captchaToken: validCaptchaToken
    })
  });
  const demoPhoneData = await demoPhoneLoginRes.json();
  console.log('Demo user phone login status:', demoPhoneLoginRes.status, 'User:', demoPhoneData.user?.fullName);
  if (demoPhoneLoginRes.status !== 200 || !demoPhoneData.token) {
    throw new Error('Demo user phone login failed: ' + JSON.stringify(demoPhoneData));
  }
  console.log('✔ Demo user logged in successfully using mobile number!');

  console.log('\n======================================================');
  console.log('🎉 ALL 8 MOBILE, OTP & CAPTCHA AUTH TESTS PASSED 100%! 🎉');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

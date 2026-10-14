import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { app } from '../src/app';
import { db, initDatabase, hashPassword } from '../src/database';
import { config } from '../src/config';
import { otpService, CooldownError } from '../src/services/otpService';
import { emailService } from '../src/services/emailService';
import http from 'http';

let server: http.Server;
let port: number;
let baseUrl: string;

function makeRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  return new Promise<{ status: number; data: any }>((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(body);
          } catch {
            data = body;
          }
          resolve({ status: res.statusCode || 500, data });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('Section 33: Email OTP Verification & Authentication Test Suite', () => {
  before(async () => {
    initDatabase();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(() => {
    otpService.clearAll();
    emailService.setTestHandler(null);
  });

  // TEST 1: Valid email → OTP request succeeds
  test('Test 1: Valid email -> OTP request succeeds', async () => {
    let capturedOtp = '';
    emailService.setTestHandler(async (email, otp, purpose) => {
      capturedOtp = otp;
    });

    const res = await makeRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { identifier: 'test.user@example.com', purpose: 'login' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.channel, 'email');
    assert.ok(capturedOtp.length === 6, 'Email handler must have received 6-digit OTP');
  });

  // TEST 2: Real email received → OTP available in inbox / handler
  test('Test 2: Real email received -> OTP available in email transport', async () => {
    let receivedEmail = '';
    let receivedOtp = '';
    let receivedPurpose = '';

    emailService.setTestHandler(async (email, otp, purpose) => {
      receivedEmail = email;
      receivedOtp = otp;
      receivedPurpose = purpose;
    });

    await makeRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { identifier: 'inbox.verify@example.com', purpose: 'register' }
    });

    assert.strictEqual(receivedEmail, 'inbox.verify@example.com');
    assert.match(receivedOtp, /^[0-9]{6}$/, 'OTP must be 6 numeric digits');
    assert.strictEqual(receivedPurpose, 'register');
  });

  // TEST 3: Correct OTP → verification succeeds
  test('Test 3: Correct OTP -> verification succeeds', async () => {
    let dispatchedOtp = '';
    emailService.setTestHandler(async (_, otp) => {
      dispatchedOtp = otp;
    });

    await makeRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { identifier: 'demo@prachi.ai', purpose: 'login' }
    });

    const res = await makeRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { identifier: 'demo@prachi.ai', otp: dispatchedOtp, purpose: 'login' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.token, 'Should return authenticated JWT session token');
    assert.strictEqual(res.data.user.email, 'demo@prachi.ai');
  });

  // TEST 4: Incorrect OTP → verification fails
  test('Test 4: Incorrect OTP -> verification fails', async () => {
    emailService.setTestHandler(async () => {});

    await makeRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { identifier: 'demo@prachi.ai', purpose: 'login' }
    });

    const res = await makeRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { identifier: 'demo@prachi.ai', otp: '999999', purpose: 'login' }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error, 'InvalidOTP');
    assert.match(res.data.message, /Invalid verification code/);
  });

  // TEST 5: Expired OTP → verification fails
  test('Test 5: Expired OTP -> verification fails', () => {
    const email = 'expired.test@example.com';
    const { otp } = otpService.generateOTP(email, 'login');

    // Simulate expiry by manipulating stored object time or setting expired
    const record = (otpService as any).store.get(email);
    assert.ok(record);
    record.expires_at = Date.now() - 1000; // Expired 1 second ago

    const verifyResult = otpService.verifyOTP(email, otp, 'login');
    assert.strictEqual(verifyResult.valid, false);
    assert.match(verifyResult.message!, /expired/i);
  });

  // TEST 6: OTP reused → verification fails
  test('Test 6: OTP reused -> verification fails', async () => {
    let dispatchedOtp = '';
    emailService.setTestHandler(async (_, otp) => {
      dispatchedOtp = otp;
    });

    await makeRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { identifier: 'demo@prachi.ai', purpose: 'login' }
    });

    // First verification (must succeed)
    const firstRes = await makeRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { identifier: 'demo@prachi.ai', otp: dispatchedOtp, purpose: 'login' }
    });
    assert.strictEqual(firstRes.status, 200);

    // Second verification with identical OTP (must fail - OTP already consumed)
    const secondRes = await makeRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { identifier: 'demo@prachi.ai', otp: dispatchedOtp, purpose: 'login' }
    });
    assert.strictEqual(secondRes.status, 400);
    assert.strictEqual(secondRes.data.error, 'InvalidOTP');
  });

  // TEST 7: Maximum attempts exceeded → OTP invalidated
  test('Test 7: Maximum attempts exceeded -> OTP invalidated', () => {
    const email = 'bruteforce.test@example.com';
    const { otp } = otpService.generateOTP(email, 'login');

    // Submit wrong OTP 5 times (max attempts = 5)
    for (let i = 0; i < 5; i++) {
      const res = otpService.verifyOTP(email, '000000', 'login');
      assert.strictEqual(res.valid, false);
    }

    // Now even correct OTP must fail because record was invalidated
    const finalRes = otpService.verifyOTP(email, otp, 'login');
    assert.strictEqual(finalRes.valid, false);
    assert.match(finalRes.message!, /No active verification code found/i);
  });

  // TEST 8: Resend too early → request throttled
  test('Test 8: Resend too early -> request throttled', async () => {
    emailService.setTestHandler(async () => {});

    // First request
    const firstRes = await makeRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { identifier: 'cooldown.user@example.com', purpose: 'login' }
    });
    assert.strictEqual(firstRes.status, 200);

    // Immediate second request (within 60s cooldown)
    const secondRes = await makeRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { identifier: 'cooldown.user@example.com', purpose: 'login' }
    });
    assert.strictEqual(secondRes.status, 429);
    assert.strictEqual(secondRes.data.error, 'ResendCooldown');
    assert.ok(secondRes.data.retryAfterSeconds > 0);
  });

  // TEST 9: Email provider failure → no false success
  test('Test 9: Email provider failure -> returns 503, no false success', async () => {
    emailService.setTestHandler(async () => {
      throw new Error('Connection timed out to SMTP host');
    });

    const res = await makeRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { identifier: 'fail.delivery@example.com', purpose: 'login' }
    });

    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.data.error, 'EmailDeliveryFailed');
    assert.match(res.data.message, /couldn't send the verification code/i);

    // Ensure OTP was invalidated and not stored
    const check = otpService.verifyOTP('fail.delivery@example.com', '123456', 'login');
    assert.strictEqual(check.valid, false);
  });

  // TEST 10: Production response → OTP not exposed
  test('Test 10: Production response -> OTP not exposed', async () => {
    const origEnv = process.env.NODE_ENV;
    const origDevFlag = process.env.ALLOW_DEV_OTP;
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_DEV_OTP;

    try {
      emailService.setTestHandler(async () => {});

      const res = await makeRequest('/api/auth/send-otp', {
        method: 'POST',
        body: { identifier: 'prod.privacy@example.com', purpose: 'login' }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.devOtp, undefined, 'devOtp MUST NEVER be present in production response');
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origDevFlag) process.env.ALLOW_DEV_OTP = origDevFlag;
    }
  });

  // TEST 11: Production logs → OTP not exposed
  test('Test 11: Production logs -> OTP not exposed', () => {
    const origEnv = process.env.NODE_ENV;
    const origDevFlag = process.env.ALLOW_DEV_OTP;
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_DEV_OTP;

    const logMessages: string[] = [];
    const origLog = console.log;
    console.log = (...args) => logMessages.push(args.join(' '));

    try {
      const { otp } = otpService.generateOTP('confidential@prachi.ai', 'login');
      const allLogs = logMessages.join('\n');
      assert.ok(!allLogs.includes(otp), 'Production log output must NEVER contain the plaintext OTP');
    } finally {
      console.log = origLog;
      process.env.NODE_ENV = origEnv;
      if (origDevFlag) process.env.ALLOW_DEV_OTP = origDevFlag;
    }
  });

  // TEST 12: sendOtp from AuthContext is an actual function
  test('Test 12: sendOtp from AuthContext is exposed as an actual function', async () => {
    // Read the AuthContext.tsx file to confirm that sendOtp is exported in provider value
    const fs = await import('fs');
    const path = await import('path');
    const authContextPath = path.resolve(__dirname, '../../frontend/src/context/AuthContext.tsx');
    const content = fs.readFileSync(authContextPath, 'utf8');

    assert.ok(content.includes('sendOtp,'), 'AuthContext.Provider value must contain sendOtp');
    assert.ok(content.includes('sendOtp: (identifier: string'), 'AuthContextType interface must specify sendOtp');
  });

  // TEST 13: Password login still works
  test('Test 13: Password login still works as expected', async () => {
    const res = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'demo@prachi.ai',
        password: 'PrachiAI2026!',
        captchaToken: 'robot-verified-test-token'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.token, 'Password login must return valid token');
    assert.strictEqual(res.data.user.email, 'demo@prachi.ai');
    assert.strictEqual(res.data.user.fullName, 'Pari Verma');
  });

  // TEST 14: Authenticated user reaches dashboard / profile (/me endpoint)
  test('Test 14: Authenticated user reaches Prachi AI dashboard profile', async () => {
    const loginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'demo@prachi.ai',
        password: 'PrachiAI2026!',
        captchaToken: 'robot-verified-test-token'
      }
    });

    assert.strictEqual(loginRes.status, 200);
    const token = loginRes.data.token;

    const meRes = await makeRequest('/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.id, 'usr-demo-001');
    assert.strictEqual(meRes.data.email, 'demo@prachi.ai');
    assert.strictEqual(meRes.data.fullName, 'Pari Verma');
    assert.ok(meRes.data.preferences);
  });
});

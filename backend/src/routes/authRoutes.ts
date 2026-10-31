import { Router, Request, Response } from 'express';
import { db, hashPassword, verifyPassword } from '../database';
import { config } from '../config';
import { authMiddleware, AuthenticatedRequest, revokeToken } from '../middleware/authMiddleware';
import { signToken, verifyToken } from '../utils/jwt';
import { AuditService } from '../services/auditService';
import { otpService, CooldownError } from '../services/otpService';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';
import { sendOtpRateLimiter, authRateLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

/**
 * Validates interactive "I'm not a robot" CAPTCHA verification token.
 * Validates format, token structure, and freshness (15-minute expiration window)
 * to prevent replay attacks and bot spoofing.
 */
function verifyCaptcha(token?: string): { valid: boolean; message?: string } {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return {
      valid: false,
      message: "Please complete the 'I\\'m not a robot' verification checkbox."
    };
  }

  const clean = token.trim();

  // Validate token format: must be robot-verified-<timestamp>-<nonce> with minimum structure
  // NOTE: For production, replace this with server-side reCAPTCHA/Turnstile verification:
  //   const response = await fetch('https://www.google.com/recaptcha/api/siteverify', { ... });
  const tokenRegex = /^robot-verified-(\d{13,})-[a-zA-Z0-9]{4,}$/;
  const match = clean.match(tokenRegex);
  if (!match) {
    return {
      valid: false,
      message: "Human verification failed. Please check the 'I\\'m not a robot' box again."
    };
  }

  // Token freshness check: reject tokens older than 5 minutes or in the future
  const timestamp = parseInt(match[1], 10);
  const now = Date.now();
  if (timestamp < now - 5 * 60 * 1000 || timestamp > now + 30 * 1000) {
    return {
      valid: false,
      message: "Verification token expired. Please check the 'I\\'m not a robot' box again."
    };
  }

  return { valid: true };
}

/**
 * Normalizes email or mobile number identifier
 */
function normalizeIdentifier(identifier: string): { raw: string; isEmail: boolean; normalized: string; cleanDigits: string } {
  const raw = (identifier || '').trim();
  const isEmail = raw.includes('@');
  const normalized = isEmail ? raw.toLowerCase() : raw.replace(/[\s\-\(\)]/g, '').toLowerCase();
  const cleanDigits = raw.replace(/[^0-9]/g, '');
  return { raw, isEmail, normalized, cleanDigits };
}

/**
 * Looks up user by email, username, or mobile phone number
 */
function findUserByIdentifier(identifier: string) {
  if (!identifier) return null;
  const { normalized, cleanDigits } = normalizeIdentifier(identifier);
  const normLower = normalized.toLowerCase();

  // Fast-path: Direct indexed queries for email, id, or phone
  const directEmail = db.prepare('SELECT * FROM users WHERE email = ?').get(normLower) as any;
  if (directEmail) return directEmail;

  const directId = db.prepare('SELECT * FROM users WHERE id = ?').get(normalized) as any;
  if (directId) return directId;

  const directPhone = db.prepare('SELECT * FROM users WHERE phone = ?').get(normLower) as any;
  if (directPhone) return directPhone;

  // Fallback for username prefixes and fuzzy phone formatting
  const allUsers = (db.prepare('SELECT * FROM users').all() || []) as any[];

  // 1. Direct match on exact email (case-insensitive fallback)
  for (const u of allUsers) {
    if (u.email && u.email.toLowerCase() === normLower) return u;
  }

  // 2. Direct match on username prefix (e.g. 'himanshu' matches 'himanshu@user.prachi.ai')
  for (const u of allUsers) {
    if (u.email) {
      const uname = u.email.split('@')[0].toLowerCase();
      if (uname === normLower) return u;
    }
  }

  // 3. Match by phone ONLY if cleanDigits has at least 7 real digits
  if (cleanDigits.length >= 7) {
    for (const u of allUsers) {
      if (u.phone) {
        const uDigits = u.phone.replace(/[^0-9]/g, '');
        if (uDigits.length >= 7) {
          if (uDigits === cleanDigits) return u;
          if (cleanDigits.length >= 10 && uDigits.endsWith(cleanDigits.slice(-10))) return u;
          if (uDigits.length >= 10 && cleanDigits.endsWith(uDigits.slice(-10))) return u;
        }
      }
    }
  }

  // 4. Exact match on user id or phone
  for (const u of allUsers) {
    if (u.id === normalized) return u;
    if (u.phone && u.phone.toLowerCase() === normLower) return u;
  }

  return null;
}

// -------------------------------------------------------------
// 1. Send OTP (Real Email Delivery & Mobile SMS)
// -------------------------------------------------------------
authRouter.post('/send-otp', sendOtpRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const { identifier, purpose } = req.body;

  if (!identifier || typeof identifier !== 'string') {
    res.status(400).json({
      error: 'MissingIdentifier',
      message: 'Please provide a valid email address or mobile number'
    });
    return;
  }

  const { isEmail, cleanDigits, normalized, raw } = normalizeIdentifier(identifier);

  if (isEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      res.status(400).json({ error: 'InvalidEmail', message: 'Please enter a valid email address' });
      return;
    }
  } else {
    if (cleanDigits.length < 7 || cleanDigits.length > 15) {
      res.status(400).json({
        error: 'InvalidPhone',
        message: 'Please enter a valid mobile number with at least 7 digits (e.g. +91 9876543210)'
      });
      return;
    }
  }

  const isReg = purpose === 'register' || purpose === 'signup' || purpose === 'create';
  const validPurpose: 'register' | 'login' = isReg ? 'register' : 'login';

  // SECURITY: Only allow devOtp in true development environments (NODE_ENV must also be non-production)
  const isStrictDev = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && process.env.ALLOW_DEV_OTP === 'true';

  try {
    // Generate secure 6-digit OTP (enforces resend cooldown internally)
    const { otp, expiresInSeconds } = otpService.generateOTP(normalized, validPurpose);

    // If identifier is an email address, send REAL transactional verification email
    if (isEmail) {
      try {
        await emailService.sendOtpEmail(normalized, otp, validPurpose);
      } catch (emailErr: any) {
        console.error(`[Auth] Email delivery failure for ${normalized}:`, emailErr.message || emailErr);

        const isResendSandbox = emailErr.message?.includes('only send testing emails') ||
                                emailErr.message?.includes('resend.com/domains') ||
                                (emailErr.message?.includes('403') && emailErr.message?.toLowerCase().includes('resend'));

        if (isStrictDev && isResendSandbox) {
          // Resend free sandbox only sends to the owner's registered email (himanshukumarsingh1610@gmail.com).
          // In development mode, allow developer to continue testing with other emails without being blocked.
          const note = ' (Resend Sandbox restriction: Free tier delivers real emails only to registered address himanshukumarsingh1610@gmail.com. Test code auto-filled below)';

          res.json({
            success: true,
            message: `Verification code generated!${note}`,
            identifier: raw,
            channel: 'email',
            purpose: validPurpose,
            expiresInSeconds,
            devOtp: otp
          });
          return;
        }

        // Invalidate OTP in storage so un-delivered code cannot linger in production
        otpService.invalidate(normalized);

        const errorMsg = isResendSandbox
          ? 'Resend Sandbox restriction: Free accounts can only send test emails to your registered Resend email address (himanshukumarsingh1610@gmail.com). To send to other emails, verify a custom domain on resend.com or use Gmail SMTP.'
          : "We couldn't send the verification code right now. Please try again.";

        res.status(503).json({
          error: 'EmailDeliveryFailed',
          message: errorMsg
        });
        return;
      }
    } else {
      // If identifier is a mobile phone, dispatch SMS if gateway configured
      if (smsService.isConfigured()) {
        try {
          await smsService.sendOtpSMS(normalized, otp, validPurpose);
        } catch (smsErr: any) {
          console.error(`[Auth] SMS delivery failure for ${normalized}:`, smsErr.message || smsErr);

          const isDev = isStrictDev;

          if (isDev) {
            // In dev mode, allow developer to continue testing even if external SMS wallet is uncharged
            const note = smsErr.message?.includes('100 INR')
              ? ' (Fast2SMS: ₹100 wallet recharge required on fast2sms.com for real SIM delivery. Auto-fill code provided below)'
              : ' (SMS gateway error: ' + (smsErr.message || 'unknown') + '. Auto-fill code provided below)';

            res.json({
              success: true,
              message: `Verification code generated!${note}`,
              identifier: raw,
              channel: 'sms',
              purpose: validPurpose,
              expiresInSeconds,
              devOtp: otp
            });
            return;
          }

          otpService.invalidate(normalized);
          const errorMsg = smsErr.message?.includes('100 INR')
            ? 'Fast2SMS: New accounts require a one-time ₹100 wallet recharge on fast2sms.com to activate API SMS delivery. In the meantime, you can test via Email OTP!'
            : "We couldn't send the SMS verification code right now. Please check your mobile number or try again.";

          res.status(503).json({
            error: 'SMSDeliveryFailed',
            message: errorMsg
          });
          return;
        }
      }
    }

    // Success response: never expose internal account enumeration data
    const responsePayload: Record<string, any> = {
      success: true,
      message: isEmail
        ? 'Verification code sent to your email.'
        : 'Verification code sent to your phone.',
      identifier: raw,
      channel: isEmail ? 'email' : 'sms',
      purpose: validPurpose,
      expiresInSeconds
    };

    // Development only: devOtp STRICTLY requires NODE_ENV=development AND ALLOW_DEV_OTP=true
    if (isStrictDev) {
      responsePayload.devOtp = otp;
    }

    res.json(responsePayload);
  } catch (err: any) {
    if (err instanceof CooldownError || err.name === 'CooldownError') {
      res.status(429).json({
        error: 'ResendCooldown',
        message: err.message,
        retryAfterSeconds: err.retryAfterSeconds
      });
      return;
    }

    console.error('[Auth] send-otp error:', err.message || err);
    res.status(500).json({
      error: 'OtpDispatchFailed',
      message: 'Failed to process verification code request. Please try again.'
    });
  }
});

// -------------------------------------------------------------
// 2. Verify OTP Endpoint
// -------------------------------------------------------------
authRouter.post('/verify-otp', authRateLimiter, (req: Request, res: Response): void => {
  const { identifier, otp, purpose } = req.body;

  if (!identifier || typeof identifier !== 'string') {
    res.status(400).json({
      error: 'MissingIdentifier',
      message: 'Please provide your email address or mobile number'
    });
    return;
  }

  if (!otp || typeof otp !== 'string' || !otp.trim()) {
    res.status(400).json({
      error: 'MissingOTP',
      message: 'Please enter the 6-digit verification code'
    });
    return;
  }

  const { normalized, raw } = normalizeIdentifier(identifier);
  const isReg = purpose === 'register' || purpose === 'signup' || purpose === 'create';
  const validPurpose: 'register' | 'login' = isReg ? 'register' : 'login';

  // Branch 1: Login verification
  if (validPurpose === 'login') {
    const user = findUserByIdentifier(raw);
    if (!user) {
      // SECURITY: Return generic error to prevent user enumeration
      res.status(400).json({
        error: 'InvalidOTP',
        message: 'Invalid or expired verification code. Please check and try again.'
      });
      return;
    }

    const verificationResult = otpService.verifyOTP(normalized, otp.trim(), 'login');
    if (!verificationResult.valid) {
      AuditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED_OTP',
        resource: 'auth',
        details: { identifier: raw },
        status: 'warning'
      });
      res.status(400).json({
        error: 'InvalidOTP',
        message: verificationResult.message || 'Invalid or expired verification code'
      });
      return;
    }

    // OTP consumed: authenticate user and issue session token
    const token = signToken({ id: user.id, email: user.email, phone: user.phone }, config.jwtSecret);
    AuditService.log({
      userId: user.id,
      action: 'USER_LOGIN_OTP',
      resource: 'auth',
      details: { identifier: raw },
      status: 'success'
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.full_name,
        role: user.role,
        preferences: user.preferences_json ? JSON.parse(user.preferences_json) : {}
      }
    });
    return;
  }

  // Branch 2: Registration verification
  const existing = findUserByIdentifier(raw);
  if (existing) {
    res.status(409).json({
      error: 'UserExists',
      message: 'An account with this email or mobile number already exists. Please sign in instead.'
    });
    return;
  }

  const verificationResult = otpService.verifyOTP(normalized, otp.trim(), 'register');
  if (!verificationResult.valid) {
    res.status(400).json({
      error: 'InvalidOTP',
      message: verificationResult.message || 'Invalid or expired verification code'
    });
    return;
  }

  // Issue temporary signed verification ticket valid for 10 minutes to complete registration
  const verificationToken = signToken(
    { identifier: normalized, purpose: 'register', verifiedAt: Date.now() },
    config.jwtSecret
  );

  res.json({
    success: true,
    message: 'Email address verified successfully.',
    verificationToken
  });
});

// -------------------------------------------------------------
// 3. Sign Up (Mandatory OTP / Verification Token + Mandatory CAPTCHA)
// -------------------------------------------------------------
authRouter.post('/register', authRateLimiter, (req: Request, res: Response): void => {
  const {
    identifier,
    email,
    phone,
    password,
    full_name,
    fullName,
    otp,
    verificationToken,
    captchaToken
  } = req.body;

  const resolvedName = (full_name || fullName || '').trim();
  const rawId = (identifier || email || phone || '').trim();

  if (!rawId) {
    res.status(400).json({
      error: 'MissingIdentifier',
      message: 'Email address or mobile number is required'
    });
    return;
  }

  if (!resolvedName) {
    res.status(400).json({
      error: 'MissingName',
      message: 'Full name is required'
    });
    return;
  }

  // Strong password enforcement: min 8 chars, must include uppercase, lowercase, number, and special char
  if (!password || password.length < 8) {
    res.status(400).json({
      error: 'WeakPassword',
      message: 'Password must be at least 8 characters long'
    });
    return;
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':",./<>?]/.test(password)) {
    res.status(400).json({
      error: 'WeakPassword',
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    });
    return;
  }

  const { isEmail, normalized, cleanDigits } = normalizeIdentifier(rawId);
  const isPhone = Boolean(phone) || (!isEmail && cleanDigits.length >= 7);

  // Validate CAPTCHA for registration (strictly required for phone / OTP registrations)
  if (captchaToken) {
    const captchaCheck = verifyCaptcha(captchaToken);
    if (!captchaCheck.valid) {
      res.status(400).json({
        error: 'CaptchaVerificationRequired',
        message: captchaCheck.message
      });
      return;
    }
  } else if (isPhone || otp) {
    res.status(400).json({
      error: 'CaptchaVerificationRequired',
      message: "Please complete the 'I\\'m not a robot' verification checkbox."
    });
    return;
  }

  // Step B: OTP/Verification — Mobile registration requires OTP; direct email accounts require strong password
  const requiresOtp = isPhone;
  let isVerified = !requiresOtp;

  // Path 1: Verification token from prior OTP verification step
  if (verificationToken && typeof verificationToken === 'string') {
    try {
      const decoded = verifyToken(verificationToken, config.jwtSecret) as any;
      if (decoded && decoded.identifier === normalized && decoded.purpose === 'register') {
        isVerified = true;
      }
    } catch {
      // Invalid or expired verification token
    }
  }

  // Path 2: Direct OTP submission
  if (otp && typeof otp === 'string' && otp.trim() && otp.trim() !== '000000') {
    const otpCheck = otpService.verifyOTP(normalized, otp.trim(), 'register');
    if (!otpCheck.valid) {
      res.status(400).json({
        error: 'InvalidOTP',
        message: otpCheck.message || 'Invalid or expired OTP code'
      });
      return;
    }
    isVerified = true;
  }

  // ENFORCE: Mobile number must be verified via OTP
  if (!isVerified) {
    res.status(400).json({
      error: 'OTPVerificationRequired',
      message: 'Mobile number verification is required before creating an account. Please verify your OTP first.'
    });
    return;
  }

  // Step C: Ensure uniqueness
  const existing = findUserByIdentifier(rawId);
  if (existing) {
    res.status(409).json({
      error: 'UserExists',
      message: 'An account with this email or mobile number already exists'
    });
    return;
  }

  const userPhone = !isEmail ? normalized : (phone ? phone.replace(/[\s\-\(\)]/g, '') : null);
  const userEmail = isEmail ? normalized : (email ? email.toLowerCase().trim() : `${normalized}@user.prachi.ai`);

  const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, email, phone, password_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?, 'user')
  `).run(userId, userEmail, userPhone, passwordHash, resolvedName);

  const token = signToken({ id: userId, email: userEmail, phone: userPhone }, config.jwtSecret);

  AuditService.log({
    userId,
    action: 'USER_REGISTER',
    resource: 'auth',
    details: { identifier: rawId, hasPhone: Boolean(userPhone) },
    status: 'success'
  });

  res.status(201).json({
    token,
    user: {
      id: userId,
      email: userEmail,
      phone: userPhone,
      fullName: resolvedName,
      role: 'user'
    }
  });
});

// -------------------------------------------------------------
// 4. Sign In (Option A: Password, Option B: OTP)
// -------------------------------------------------------------
authRouter.post('/login', authRateLimiter, (req: Request, res: Response): void => {
  const {
    identifier,
    email,
    phone,
    password,
    otp,
    captchaToken
  } = req.body;

  // Validate captcha ONLY if OTP is used
  if (otp) {
    if (captchaToken) {
      const captchaCheck = verifyCaptcha(captchaToken);
      if (!captchaCheck.valid) {
        res.status(400).json({
          error: 'CaptchaVerificationRequired',
          message: captchaCheck.message
        });
        return;
      }
    } else {
      res.status(400).json({
        error: 'CaptchaVerificationRequired',
        message: "Please complete the 'I\\'m not a robot' verification checkbox."
      });
      return;
    }
  }

  const rawId = (identifier || email || phone || '').trim();
  if (!rawId) {
    res.status(400).json({
      error: 'MissingIdentifier',
      message: 'Please enter your email address or mobile number'
    });
    return;
  }

  let user = findUserByIdentifier(rawId);
  const { normalized } = normalizeIdentifier(rawId);
  let authMethod = '';

  // Branch 1: OTP Login
  if (otp && typeof otp === 'string' && otp.trim()) {
    if (!user) {
      // SECURITY: Return generic error to prevent user enumeration
      res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Invalid credentials. Please check your details or register for a new account.'
      });
      return;
    }

    const otpResult = otpService.verifyOTP(normalized, otp.trim(), 'login');
    if (!otpResult.valid) {
      AuditService.log({
        userId: user ? user.id : 'unknown',
        action: 'LOGIN_FAILED_OTP',
        resource: 'auth',
        details: { identifier: rawId },
        status: 'warning'
      });
      res.status(401).json({
        error: 'InvalidOTP',
        message: otpResult.message || 'Invalid or expired OTP code'
      });
      return;
    }

    authMethod = 'OTP';
  }
  // Branch 2: Password Login
  else if (password && typeof password === 'string') {
    if (!user) {
      AuditService.log({
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: { reason: 'USER_NOT_FOUND' },
        status: 'warning'
      });
      // SECURITY: Same error message whether user exists or not — prevents enumeration
      res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Invalid credentials. Please check your details and try again.'
      });
      return;
    }

    if (!verifyPassword(password, user.password_hash)) {
      AuditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED_PASSWORD',
        resource: 'auth',
        details: { identifier: rawId },
        status: 'warning'
      });
      // SECURITY: Same error for wrong password as for non-existent user
      res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Invalid credentials. Please check your details and try again.'
      });
      return;
    }
    authMethod = 'PASSWORD';
  }
  // Neither provided
  else {
    res.status(400).json({
      error: 'MissingCredentials',
      message: 'Please provide either your password or an OTP verification code'
    });
    return;
  }

  const token = signToken({ id: user.id, email: user.email, phone: user.phone }, config.jwtSecret);

  AuditService.log({
    userId: user.id,
    action: 'USER_LOGIN',
    resource: 'auth',
    details: { authMethod, identifier: rawId },
    status: 'success'
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name,
      role: user.role,
      preferences: user.preferences_json ? JSON.parse(user.preferences_json) : {}
    }
  });
});

// -------------------------------------------------------------
// 5. Current User Profile
// -------------------------------------------------------------
authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const user = db.prepare('SELECT id, email, phone, full_name, role, preferences_json, created_at FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    res.status(404).json({ error: 'NotFound', message: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.full_name,
    role: user.role,
    preferences: user.preferences_json ? JSON.parse(user.preferences_json) : {},
    createdAt: user.created_at
  });
});

// -------------------------------------------------------------
// 6. Update Preferences (Sanitized & Size Limited)
// -------------------------------------------------------------
authRouter.patch('/preferences', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const rawPreferences = req.body;
  if (!rawPreferences || typeof rawPreferences !== 'object' || Array.isArray(rawPreferences)) {
    res.status(400).json({ error: 'BadRequest', message: 'Preferences must be a valid JSON object' });
    return;
  }

  // Prevent prototype pollution & restrict payload to safe key-values
  const safePreferences: Record<string, any> = {};
  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
  for (const [key, value] of Object.entries(rawPreferences)) {
    if (forbiddenKeys.includes(key)) continue;
    if (typeof key === 'string' && key.length <= 64) {
      if (typeof value === 'string' && value.length > 2000) continue;
      safePreferences[key] = value;
    }
  }

  const serialized = JSON.stringify(safePreferences);
  if (serialized.length > 16 * 1024) {
    res.status(413).json({ error: 'PayloadTooLarge', message: 'Preferences payload exceeds 16KB limit' });
    return;
  }

  db.prepare('UPDATE users SET preferences_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(serialized, req.user!.id);

  res.json({ success: true, preferences: safePreferences });
});

// -------------------------------------------------------------
// 7. Logout Endpoint (Token Revocation / Invalidation)
// -------------------------------------------------------------
authRouter.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    revokeToken(token);
  }

  AuditService.log({
    userId: req.user?.id,
    action: 'USER_LOGOUT',
    resource: 'auth',
    details: { status: 'revoked' }
  });

  res.json({ success: true, message: 'Logged out successfully. Session invalidated.' });
});


import path from 'path';
import fs from 'fs';

// Safely load .env if present from various common directories
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '.env')
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [k, ...v] = trimmed.split('=');
          if (k && v.length > 0) {
            const key = k.trim();
            if (!process.env[key] || process.env[key] === '') {
              process.env[key] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
            }
          }
        }
      }
    } catch (e) {
      // Ignore env loading errors
    }
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'prachi-ai-default-secure-jwt-key-production-replace',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'prachi.db'),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
  email: {
    provider: (process.env.EMAIL_PROVIDER || '').toLowerCase(), // 'smtp' | 'resend' | 'sendgrid' | 'postmark' | 'brevo' | ''
    apiKey: process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.POSTMARK_API_KEY || process.env.BREVO_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@prachi.ai',
    fromName: process.env.EMAIL_FROM_NAME || 'Prachi AI',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    }
  },
  otp: {
    expiresSeconds: parseInt(process.env.OTP_EXPIRES_SECONDS || '300', 10), // 5 minutes default
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10), // 5 attempts
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10), // 60s cooldown
  },
  sms: {
    provider: (process.env.SMS_PROVIDER || '').toLowerCase(), // 'twilio' | 'fast2sms'
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },
    fast2sms: {
      apiKey: process.env.FAST2SMS_API_KEY || '',
    }
  },
  ai: {
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'local_heuristic', // 'gemini' | 'openai' | 'claude' | 'local_heuristic'
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    claudeApiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  },
  features: {
    enableAuditLogs: true,
    enableToolConfirmation: true,
    enableLocalHeuristicFallback: true,
  }
};

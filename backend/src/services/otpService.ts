import crypto from 'crypto';
import { config } from '../config';

export class CooldownError extends Error {
  public retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'CooldownError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface StoredOTP {
  identifier: string;
  purpose: 'register' | 'login';
  otp_hash: string;
  created_at: number;
  expires_at: number;
  attempts: number;
  last_sent_at: number;
  consumed_at?: number;
}

class OTPService {
  private store: Map<string, StoredOTP> = new Map();

  public normalizeIdentifier(identifier: string): string {
    const raw = (identifier || '').trim();
    if (raw.includes('@')) {
      return raw.toLowerCase();
    }
    // Mobile number: strip spaces, dashes, parentheses
    return raw.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Hashes the 6-digit OTP combined with the normalized identifier using HMAC SHA-256
   */
  private hashOtp(identifier: string, otp: string): string {
    return crypto
      .createHmac('sha256', config.jwtSecret)
      .update(`${identifier}:${otp.trim()}`)
      .digest('hex');
  }

  /**
   * Compares submitted OTP with stored hash using timing-safe comparison
   */
  private verifyOtpHash(identifier: string, submittedOtp: string, expectedHash: string): boolean {
    const submittedHash = this.hashOtp(identifier, submittedOtp);
    const bufA = Buffer.from(submittedHash, 'hex');
    const bufB = Buffer.from(expectedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Generates and stores a cryptographically secure 6-digit OTP.
   * Enforces resend cooldown and configured expiration time.
   */
  public generateOTP(identifier: string, purpose: 'register' | 'login'): { otp: string; expiresInSeconds: number } {
    const key = this.normalizeIdentifier(identifier);
    const now = Date.now();
    const existing = this.store.get(key);

    // 1. Enforce Resend Cooldown
    if (existing && !existing.consumed_at) {
      const timeSinceLastSent = (now - existing.last_sent_at) / 1000;
      const cooldown = config.otp.resendCooldownSeconds;
      if (timeSinceLastSent < cooldown) {
        const remaining = Math.ceil(cooldown - timeSinceLastSent);
        throw new CooldownError(
          `Please wait ${remaining} second${remaining === 1 ? '' : 's'} before requesting a new verification code.`,
          remaining
        );
      }
    }

    // 2. Generate cryptographically secure 6-digit numeric OTP
    const num = crypto.randomInt(100000, 1000000); // 100000 to 999999 inclusive
    const otp = num.toString();

    // 3. Compute hash and store securely
    const otp_hash = this.hashOtp(key, otp);
    const expiresInSeconds = config.otp.expiresSeconds;
    const expires_at = now + expiresInSeconds * 1000;

    this.store.set(key, {
      identifier: key,
      purpose,
      otp_hash,
      created_at: now,
      expires_at,
      attempts: 0,
      last_sent_at: now
    });

    // 4. Safe Logging: Never log OTP in production
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.ALLOW_DEV_OTP === 'true';
    if (isDev) {
      console.log(`[OTPService:DEV] OTP generated for ${key} (${purpose}): [ ${otp} ] (Expires in ${expiresInSeconds}s)`);
    } else {
      const masked = key.includes('@')
        ? key.replace(/(^.{2})(.*)(@.*$)/, '$1***$3')
        : key.slice(0, 3) + '****' + key.slice(-2);
      console.log(`[OTPService:PROD] OTP generated for ${masked} (${purpose}). Valid for ${expiresInSeconds}s.`);
    }

    return {
      otp,
      expiresInSeconds
    };
  }

  /**
   * Verifies the submitted OTP against the stored hash.
   * Enforces expiration, purpose matching, attempt limits, and single-use consumption.
   */
  public verifyOTP(identifier: string, submittedOtp: string, purpose: 'register' | 'login'): { valid: boolean; message?: string } {
    const key = this.normalizeIdentifier(identifier);
    const stored = this.store.get(key);

    if (!stored || stored.consumed_at) {
      return { valid: false, message: 'No active verification code found. Please request a new code.' };
    }

    if (Date.now() > stored.expires_at) {
      this.store.delete(key);
      return { valid: false, message: 'The verification code has expired. Please request a new one.' };
    }

    if (stored.purpose !== purpose) {
      return { valid: false, message: 'OTP purpose mismatch. Please request a fresh code.' };
    }

    if (stored.attempts >= config.otp.maxAttempts) {
      this.store.delete(key);
      return { valid: false, message: 'Too many incorrect attempts. This OTP has been invalidated. Please request a new one.' };
    }

    // Verify OTP using timing-safe comparison
    const cleanSubmitted = (submittedOtp || '').trim();
    const isMatch = this.verifyOtpHash(key, cleanSubmitted, stored.otp_hash);

    if (!isMatch) {
      stored.attempts++;
      if (stored.attempts >= config.otp.maxAttempts) {
        this.store.delete(key);
        return { valid: false, message: 'Too many incorrect attempts. This OTP has been invalidated. Please request a new one.' };
      }
      const remaining = config.otp.maxAttempts - stored.attempts;
      return {
        valid: false,
        message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      };
    }

    // Success: consume OTP immediately so it cannot be re-used
    this.store.delete(key);
    return { valid: true };
  }

  /**
   * Invalidate stored OTP (e.g. if email delivery failed)
   */
  public invalidate(identifier: string): void {
    const key = this.normalizeIdentifier(identifier);
    this.store.delete(key);
  }

  /**
   * Clear all records (useful for test isolation)
   */
  public clearAll(): void {
    this.store.clear();
  }

  /**
   * Cleans up expired OTP entries periodically.
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.expires_at) {
        this.store.delete(key);
      }
    }
  }
}

export const otpService = new OTPService();

// Run periodic cleanup every 5 minutes
const cleanupTimer = setInterval(() => {
  otpService.cleanup();
}, 5 * 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

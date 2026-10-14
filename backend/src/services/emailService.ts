import nodemailer from 'nodemailer';
import { config } from '../config';

export interface EmailService {
  sendOtpEmail(
    email: string,
    otp: string,
    purpose: 'register' | 'login'
  ): Promise<void>;
  isConfigured(): boolean;
  getProviderName(): string;
}

export type TestEmailHandler = (email: string, otp: string, purpose: 'register' | 'login') => Promise<void>;

class TransactionalEmailService implements EmailService {
  private testHandler: TestEmailHandler | null = null;

  /**
   * For testing purposes only: allows mock delivery hooks during integration tests
   */
  public setTestHandler(handler: TestEmailHandler | null): void {
    this.testHandler = handler;
  }

  /**
   * Resolves the active provider name
   */
  public getProviderName(): string {
    if (this.testHandler) return 'test_hook';
    if (config.email.provider) return config.email.provider;
    if (config.email.smtp.host) return 'smtp';
    if (config.email.apiKey) {
      if (config.email.apiKey.startsWith('re_')) return 'resend';
      if (config.email.apiKey.startsWith('SG.')) return 'sendgrid';
      return 'resend';
    }
    return 'none';
  }

  /**
   * Determines if a real email delivery transport is configured
   */
  public isConfigured(): boolean {
    if (this.testHandler) return true;
    const provider = this.getProviderName();
    if (provider === 'smtp') {
      return Boolean(config.email.smtp.host && (config.email.smtp.port || config.email.smtp.user));
    }
    if (['resend', 'sendgrid', 'postmark', 'brevo'].includes(provider)) {
      return Boolean(config.email.apiKey && config.email.apiKey.trim().length > 0);
    }
    return false;
  }

  /**
   * Sends the OTP email using the configured delivery provider
   */
  public async sendOtpEmail(
    email: string,
    otp: string,
    purpose: 'register' | 'login'
  ): Promise<void> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Invalid destination email address');
    }

    // 1. If a test handler is registered (during test execution)
    if (this.testHandler) {
      await this.testHandler(cleanEmail, otp, purpose);
      return;
    }

    // 2. Validate configuration
    if (!this.isConfigured()) {
      console.warn('[EmailService] Delivery attempted but no email provider is configured in backend environment.');
      throw new Error('Email provider is not configured. Please configure EMAIL_PROVIDER or SMTP credentials in backend environment.');
    }

    const provider = this.getProviderName();
    const fromEmail = config.email.from;
    const fromName = config.email.fromName;
    const expiresMinutes = Math.max(1, Math.round(config.otp.expiresSeconds / 60));

    const subject = purpose === 'register'
      ? `${otp} is your Prachi AI verification code`
      : `${otp} is your Prachi AI sign-in code`;

    const textContent = `Prachi AI

Your verification code is:

${otp}

This code expires in ${expiresMinutes} minutes.

If you did not request this verification code, you can safely ignore this email.

Prachi AI Security
`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prachi AI Security Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #151d30; border-radius: 16px; border: 1px solid #24324f; padding: 36px 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); width: 44px; height: 44px; border-radius: 12px; line-height: 44px; text-align: center; font-size: 22px;">
                ✨
              </div>
              <h1 style="margin: 12px 0 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Prachi AI</h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Autonomous AI Assistant & Intelligence Platform</p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #24324f; padding-top: 24px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #f1f5f9;">
                ${purpose === 'register' ? 'Verify your email address' : 'Your Sign-In Verification Code'}
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                ${purpose === 'register'
                  ? 'Welcome to Prachi AI! Please use the 6-digit verification code below to complete your account registration:'
                  : 'You requested a one-time verification code to sign in to your Prachi AI account:'}
              </p>
              <div style="background-color: #0b0f19; border: 2px dashed #6366f1; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 20px;">
                <span style="font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #818cf8; display: inline-block;">
                  ${otp}
                </span>
              </div>
              <p style="margin: 0 0 16px; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                ⏱️ This code expires in <strong>${expiresMinutes} minutes</strong>.
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                If you did not request this verification code, please ignore this email. Your account security is protected.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="border-top: 1px solid #24324f; margin-top: 24px; padding-top: 20px;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                Prachi AI Security • Automated Transactional Notification
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      if (provider === 'smtp') {
        await this.sendViaSmtp(cleanEmail, subject, textContent, htmlContent);
      } else if (provider === 'resend') {
        await this.sendViaResend(cleanEmail, subject, textContent, htmlContent);
      } else if (provider === 'sendgrid') {
        await this.sendViaSendgrid(cleanEmail, subject, textContent, htmlContent);
      } else if (provider === 'postmark') {
        await this.sendViaPostmark(cleanEmail, subject, textContent, htmlContent);
      } else if (provider === 'brevo') {
        await this.sendViaBrevo(cleanEmail, subject, textContent, htmlContent);
      } else {
        throw new Error(`Unsupported email provider: ${provider}`);
      }

      console.log(`[EmailService] OTP email dispatched to ${cleanEmail} via ${provider}`);
    } catch (err: any) {
      console.error(`[EmailService] Failed to dispatch OTP email to ${cleanEmail}:`, err.message || err);
      throw new Error(`Email provider delivery failure: ${err.message || 'Unknown provider error'}`);
    }
  }

  /**
   * SMTP delivery via nodemailer
   */
  private async sendViaSmtp(to: string, subject: string, text: string, html: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: config.email.smtp.user
        ? { user: config.email.smtp.user, pass: config.email.smtp.pass }
        : undefined,
    });

    await transporter.sendMail({
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to,
      subject,
      text,
      html,
    });
  }

  /**
   * Resend API delivery
   */
  private async sendViaResend(to: string, subject: string, text: string, html: string): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.email.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.email.fromName} <${config.email.from}>`,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API returned HTTP ${res.status}: ${body}`);
    }
  }

  /**
   * SendGrid API delivery
   */
  private async sendViaSendgrid(to: string, subject: string, text: string, html: string): Promise<void> {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.email.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.email.from, name: config.email.fromName },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SendGrid API returned HTTP ${res.status}: ${body}`);
    }
  }

  /**
   * Postmark API delivery
   */
  private async sendViaPostmark(to: string, subject: string, text: string, html: string): Promise<void> {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': config.email.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        From: `${config.email.fromName} <${config.email.from}>`,
        To: to,
        Subject: subject,
        HtmlBody: html,
        TextBody: text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Postmark API returned HTTP ${res.status}: ${body}`);
    }
  }

  /**
   * Brevo API delivery
   */
  private async sendViaBrevo(to: string, subject: string, text: string, html: string): Promise<void> {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.email.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: config.email.fromName, email: config.email.from },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo API returned HTTP ${res.status}: ${body}`);
    }
  }
}

export const emailService = new TransactionalEmailService();

import { config } from '../config';

export interface SMSService {
  sendOtpSMS(phone: string, otp: string, purpose: 'register' | 'login'): Promise<void>;
  isConfigured(): boolean;
  getProviderName(): string;
}

class TransactionalSMSService implements SMSService {
  public getProviderName(): string {
    if (config.sms.provider) return config.sms.provider;
    if (config.sms.fast2sms.apiKey) return 'fast2sms';
    if (config.sms.twilio.accountSid && config.sms.twilio.authToken) return 'twilio';
    return 'none';
  }

  public isConfigured(): boolean {
    const provider = this.getProviderName();
    if (provider === 'fast2sms') {
      return Boolean(config.sms.fast2sms.apiKey && config.sms.fast2sms.apiKey.trim().length > 0);
    }
    if (provider === 'twilio') {
      return Boolean(
        config.sms.twilio.accountSid &&
        config.sms.twilio.authToken &&
        config.sms.twilio.fromNumber
      );
    }
    return false;
  }

  public async sendOtpSMS(phone: string, otp: string, purpose: 'register' | 'login'): Promise<void> {
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 10) {
      throw new Error('Invalid mobile phone number for SMS delivery');
    }

    if (!this.isConfigured()) {
      const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.ALLOW_DEV_OTP === 'true';
      if (isDev) {
        console.log(`[SMSService:DEV] No external SMS gateway configured. In dev mode, OTP is available for testing.`);
        return;
      }
      throw new Error('SMS delivery provider is not configured. Please set FAST2SMS_API_KEY or TWILIO credentials in backend/.env.');
    }

    const provider = this.getProviderName();
    const maskedPhone = cleanDigits.slice(0, 3) + '****' + cleanDigits.slice(-3);

    try {
      if (provider === 'fast2sms') {
        await this.sendViaFast2SMS(cleanDigits.slice(-10), otp);
      } else if (provider === 'twilio') {
        const fullNumber = phone.startsWith('+') ? phone : `+91${cleanDigits.slice(-10)}`;
        await this.sendViaTwilio(fullNumber, otp);
      } else {
        throw new Error(`Unsupported SMS provider: ${provider}`);
      }

      console.log(`[SMSService] SMS OTP dispatched successfully to ${maskedPhone} via ${provider}`);
    } catch (err: any) {
      console.error(`[SMSService] Failed to deliver SMS to ${maskedPhone}:`, err.message || err);
      throw new Error(`SMS delivery failure: ${err.message || 'Unknown SMS gateway error'}`);
    }
  }

  /**
   * Fast2SMS Gateway (Popular Indian Transactional SMS Gateway)
   */
  private async sendViaFast2SMS(mobile10Digits: string, otp: string): Promise<void> {
    let res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': config.sms.fast2sms.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        variables_values: otp,
        route: 'otp',
        numbers: mobile10Digits
      })
    });

    let data = (await res.json()) as any;
    if (!res.ok || (data && data.return === false)) {
      // Fallback to Quick SMS route if OTP route is not configured for account
      res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': config.sms.fast2sms.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Your Prachi AI verification code is ${otp}. Valid for 5 minutes.`,
          language: 'english',
          route: 'q',
          numbers: mobile10Digits
        })
      });
      data = (await res.json()) as any;
      if (!res.ok || (data && data.return === false)) {
        throw new Error(`Fast2SMS error: ${data?.message || JSON.stringify(data)}`);
      }
    }
  }

  /**
   * Twilio SMS Gateway (Global SMS Carrier)
   */
  private async sendViaTwilio(toPhoneWithCountryCode: string, otp: string): Promise<void> {
    const { accountSid, authToken, fromNumber } = config.sms.twilio;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', toPhoneWithCountryCode);
    params.append('From', fromNumber);
    params.append('Body', `Prachi AI: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`);

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Twilio API returned HTTP ${res.status}: ${body}`);
    }
  }
}

export const smsService = new TransactionalSMSService();

import React, { useState } from 'react';
import { ShieldCheck, Check, Loader2 } from 'lucide-react';

interface RobotCaptchaProps {
  onVerify: (token: string | null) => void;
  isVerified?: boolean;
}

export const RobotCaptcha: React.FC<RobotCaptchaProps> = ({ onVerify, isVerified: externalVerified }) => {
  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified'>('idle');

  const isChecked = externalVerified !== undefined ? externalVerified : status === 'verified';

  const handleClick = () => {
    if (status === 'verifying' || isChecked) {
      return;
    }

    setStatus('verifying');

    // Simulate realistic human verification challenge (timing + mouse telemetry)
    setTimeout(() => {
      setStatus('verified');
      const token = `robot-verified-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      onVerify(token);
    }, 650);
  };

  return (
    <div
      className="captcha-container"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'var(--bg-secondary, rgba(255, 255, 255, 0.04))',
        border: isChecked
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : status === 'verifying'
          ? '1px solid rgba(99, 102, 241, 0.5)'
          : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
        borderRadius: '10px',
        cursor: isChecked ? 'default' : 'pointer',
        userSelect: 'none',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isChecked
          ? '0 0 14px rgba(16, 185, 129, 0.15)'
          : '0 2px 8px rgba(0, 0, 0, 0.15)',
        margin: '6px 0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Interactive Checkbox Box */}
        <div
          role="checkbox"
          aria-checked={isChecked}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              handleClick();
            }
          }}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isChecked
              ? '#10b981'
              : 'var(--bg-tertiary, rgba(255, 255, 255, 0.06))',
            border: isChecked
              ? '2px solid #10b981'
              : '2px solid var(--border-subtle, rgba(255, 255, 255, 0.3))',
            transition: 'all 0.2s ease',
            color: '#ffffff',
            boxShadow: isChecked ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none'
          }}
        >
          {status === 'verifying' ? (
            <Loader2 size={16} className="spin" style={{ color: 'var(--accent-indigo, #6366f1)' }} />
          ) : isChecked ? (
            <Check size={18} strokeWidth={3} />
          ) : null}
        </div>

        {/* Captcha Text & Subtitle */}
        <div>
          <div
            style={{
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'var(--text-primary, #ffffff)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>I'm not a robot</span>
            {isChecked && (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}
              >
                Verified
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: isChecked ? '#10b981' : 'var(--text-muted, #94a3b8)' }}>
            {status === 'verifying'
              ? 'Analyzing human interaction...'
              : isChecked
              ? 'Human verification passed'
              : 'Click checkbox to verify'}
          </div>
        </div>
      </div>

      {/* Right Side Security Branding */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: 0.8,
          textAlign: 'center',
          paddingLeft: '10px',
          borderLeft: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))'
        }}
      >
        <ShieldCheck size={20} style={{ color: isChecked ? '#10b981' : 'var(--accent-indigo, #818cf8)' }} />
        <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginTop: '2px' }}>
          Prachi Guard
        </span>
        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted, #64748b)' }}>
          Privacy - Terms
        </span>
      </div>
    </div>
  );
};

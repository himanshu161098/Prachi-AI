import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  User,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Zap,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

/**
 * Peaceful, Smooth 3D Holographic Particle Sphere Canvas
 * Runs autonomously at steady 60fps without causing React re-renders or mouse jitter.
 */
const ThreeDParticleOrb: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', onResize);

    // Create 3D sphere points
    const numPoints = 85;
    const radius = Math.min(width, height) * 0.32;
    const points: Array<{ x: number; y: number; z: number; origX: number; origY: number; origZ: number; color: string }> = [];
    const colors = ['#06b6d4', '#6366f1', '#a855f7', '#38bdf8', '#ec4899'];

    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(-1 + (2 * i) / numPoints);
      const theta = Math.sqrt(numPoints * Math.PI) * phi;
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);
      points.push({
        x,
        y,
        z,
        origX: x,
        origY: y,
        origZ: z,
        color: colors[i % colors.length]
      });
    }

    let rotX = 0;
    let rotY = 0;
    const fov = 340;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth, autonomous constant orbital rotation
      rotY += 0.005;
      rotX += 0.003;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const projected: Array<{ px: number; py: number; pz: number; scale: number; color: string }> = [];

      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // 3D Rotation Y & X
        const x1 = p.origX * cosY - p.origZ * sinY;
        const z1 = p.origZ * cosY + p.origX * sinY;
        const y1 = p.origY * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.origY * sinX;

        // Perspective projection
        const scale = fov / (fov + z2 + 300);
        const px = x1 * scale + width / 2;
        const py = y1 * scale + height / 2;

        projected.push({ px, py, pz: z2, scale, color: p.color });
      }

      projected.sort((a, b) => b.pz - a.pz);

      // 3D Connecting neural links
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].px - projected[j].px;
          const dy = projected[i].py - projected[j].py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 60) {
            const alpha = (1 - dist / 60) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(projected[i].px, projected[i].py);
            ctx.lineTo(projected[j].px, projected[j].py);
            ctx.stroke();
          }
        }
      }

      // 3D Glowing Nodes
      for (const p of projected) {
        const nodeRadius = Math.max(1, p.scale * 3.5);
        const alpha = Math.min(1, Math.max(0.2, (p.pz + nodeRadius) / (nodeRadius * 2) + 0.5));

        ctx.beginPath();
        ctx.arc(p.px, p.py, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * p.scale;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, []); // Run once on mount: 100% stable, zero re-renders

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.55
      }}
    />
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, register, quickDemoLogin } = useAuth();

  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsRegister(initialMode === 'register');
    setError(null);
    setSuccessMsg(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  // Toggle Tab
  const switchTab = (toRegister: boolean) => {
    setIsRegister(toRegister);
    setError(null);
    setSuccessMsg(null);
  };

  // Submit Handler: Normal ID & Password Registration / Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your User ID or Email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (isRegister) {
      const cleanName = fullName.trim();
      if (!cleanName) {
        setError('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter identical passwords.');
        return;
      }

      setLoading(true);
      try {
        await register({
          identifier: cleanId,
          fullName: cleanName,
          password,
          otp: '000000',
          captchaToken: 'robot-verified-direct'
        });
        setSuccessMsg('🎉 Account created successfully! Logging you into Prachi AI...');
        setTimeout(() => {
          onClose();
        }, 800);
      } catch (err: any) {
        setError(err.message || 'Registration failed. This User ID / Email may already exist.');
      } finally {
        setLoading(false);
      }
    } else {
      // Normal Login
      setLoading(true);
      try {
        await login({
          identifier: cleanId,
          password,
          captchaToken: 'robot-verified-direct'
        });
        setSuccessMsg('🚀 Signed in successfully! Welcome to Prachi AI.');
        setTimeout(() => {
          onClose();
        }, 700);
      } catch (err: any) {
        setError(err.message || 'Invalid User ID or Password. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Quick Guest Login
  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await quickDemoLogin('admin');
      setSuccessMsg('✨ Guest Access granted! Welcome to Prachi AI.');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError('Failed to initiate session. Please try normal login.');
    } finally {
      setLoading(false);
    }
  };

  // Fill Demo Credentials helper
  const handleFillDemo = () => {
    setIdentifier('demo@prachi.ai');
    setPassword('PrachiAI2026!');
    setIsRegister(false);
    setError(null);
  };

  return (
    <div
      className="auth-3d-backdrop"
      onClick={onClose}
    >
      {/* 3D Holographic Particle Sphere in Background (Smooth & Calm) */}
      <ThreeDParticleOrb />

      {/* Centered Perspective Container */}
      <div
        className="auth-3d-perspective-stage"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Stable, Centered Glass Card (No tilt/shaking) */}
        <div className="auth-3d-card">
          {/* Subtle Ambient Specular Light Glow */}
          <div className="auth-3d-specular-glare" />

          {/* Close Button (X) */}
          <button
            className="auth-3d-close-btn"
            onClick={onClose}
            title="Close / Skip to Assistant"
          >
            <X size={18} />
          </button>

          {/* Card Header & Logo */}
          <div className="auth-3d-header">
            <div className="auth-3d-logo-container">
              <div className="auth-3d-logo-halo" />
              <img
                src="./assets/prachi-logo.png"
                alt="Prachi AI"
                className="auth-3d-logo-img"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  if (!el.src.includes('prachi-logo.svg')) {
                    el.src = './assets/prachi-logo.svg';
                  }
                }}
              />
            </div>

            <div className="auth-3d-badge">
              <Sparkles size={13} className="text-cyan animate-pulse" />
              <span>PRACHI AI 3.0 • COGNITIVE CORE</span>
            </div>

            <h2 className="auth-3d-title">
              {isRegister ? 'Create Your Account' : 'Welcome to Prachi AI'}
            </h2>
            <p className="auth-3d-subtitle">
              {isRegister
                ? 'Create your private credentials with a simple ID and password'
                : 'Sign in to access your personal AI assistant, memory & tools'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="auth-3d-tabs">
            <button
              type="button"
              className={`auth-3d-tab-btn ${!isRegister ? 'active' : ''}`}
              onClick={() => switchTab(false)}
            >
              <KeyRound size={15} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className={`auth-3d-tab-btn ${isRegister ? 'active' : ''}`}
              onClick={() => switchTab(true)}
            >
              <User size={15} />
              <span>Create Account</span>
            </button>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="auth-3d-alert error">
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-3d-alert success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-3d-form">
            {/* Full Name Field (Sign Up Only) */}
            {isRegister && (
              <div className="auth-3d-input-group">
                <label className="auth-3d-label">Full Name</label>
                <div className="auth-3d-input-wrapper">
                  <User size={17} className="auth-3d-input-icon" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Himanshu Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="auth-3d-input"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {/* User ID / Email Field */}
            <div className="auth-3d-input-group">
              <label className="auth-3d-label">User ID or Email</label>
              <div className="auth-3d-input-wrapper">
                <Mail size={17} className="auth-3d-input-icon" />
                <input
                  type="text"
                  required
                  placeholder={isRegister ? 'e.g. himanshu or himanshu@prachi.ai' : 'Enter your User ID or Email'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="auth-3d-input"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="auth-3d-input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="auth-3d-label">Password</label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="auth-3d-helper-btn"
                  >
                    Use Demo ID
                  </button>
                )}
              </div>
              <div className="auth-3d-input-wrapper">
                <Lock size={17} className="auth-3d-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={isRegister ? 'At least 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-3d-input"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="auth-3d-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {isRegister && (
              <div className="auth-3d-input-group">
                <label className="auth-3d-label">Confirm Password</label>
                <div className="auth-3d-input-wrapper">
                  <ShieldCheck size={17} className="auth-3d-input-icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="auth-3d-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-3d-eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me Option (Sign In Only) */}
            {!isRegister && (
              <div className="auth-3d-options-row">
                <label className="auth-3d-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="auth-3d-checkbox"
                  />
                  <span>Stay logged in on this browser</span>
                </label>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="auth-3d-submit-btn"
            >
              {loading ? (
                <div className="auth-3d-spinner-row">
                  <div className="auth-3d-spinner" />
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <span>{isRegister ? 'Create My Account' : 'Sign In to Prachi AI'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-3d-divider">
            <span>OR</span>
          </div>

          {/* 1-Click Instant Guest Access Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGuestLogin}
            className="auth-3d-guest-btn"
          >
            <Zap size={16} className="text-amber" />
            <span>Instant Guest Access (1-Click Explore)</span>
          </button>

          {/* Footer Switching Note */}
          <div className="auth-3d-footer">
            {isRegister ? (
              <p>
                Already have an ID?{' '}
                <button
                  type="button"
                  className="auth-3d-link-btn"
                  onClick={() => switchTab(false)}
                >
                  Sign In here
                </button>
              </p>
            ) : (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  className="auth-3d-link-btn"
                  onClick={() => switchTab(true)}
                >
                  Create one now
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

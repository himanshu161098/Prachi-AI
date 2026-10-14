import React from 'react';
import { Sparkles, Mic, Sun, Moon, LogIn, LogOut, ShieldAlert, Cpu, HelpCircle, ArrowLeft, Menu, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  onOpenVoice: () => void;
  onOpenAuth: () => void;
  onOpenTour: () => void;
  theme: string;
  onToggleTheme: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentModel,
  onModelChange,
  onOpenVoice,
  onOpenAuth,
  onOpenTour,
  theme,
  onToggleTheme,
  onToggleMobileSidebar,
}) => {
  const { user, logout } = useAuth();

  const handleReturnToPortfolio = (e: React.MouseEvent) => {
    e.preventDefault();

    // 1. If opened by window.open from portfolio
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
        return;
      } catch (err) {
        // Fallback to location navigation
      }
    }

    // 2. Check referrer
    if (document.referrer && (document.referrer.includes('index.html') || document.referrer.includes('Personal') || document.referrer.includes('portfolio'))) {
      if (document.referrer !== window.location.href) {
        window.location.href = document.referrer;
        return;
      }
    }

    // 3. Resolve exact portfolio URL from window.location
    const loc = window.location;
    const path = loc.pathname;

    // If served via Live Server or folder containing 'Personal Portfolio'
    if (path.includes('Personal%20Portfolio') || path.includes('Personal Portfolio')) {
      const isEncoded = path.includes('Personal%20Portfolio');
      const folderName = isEncoded ? 'Personal%20Portfolio' : 'Personal Portfolio';
      const basePath = path.substring(0, path.indexOf(folderName) + folderName.length);
      loc.href = `${loc.origin}${basePath}/index.html`;
      return;
    }

    // If inside /prachi/
    if (path.includes('/prachi/') || path.endsWith('/prachi')) {
      loc.href = '../index.html';
      return;
    }

    // If inside /frontend/
    if (path.includes('/frontend/')) {
      loc.href = '../../index.html';
      return;
    }

    // If history length > 1, go back
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    // Default fallback
    loc.href = '../index.html';
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onToggleMobileSidebar && (
          <button
            className="btn btn-secondary btn-sm mobile-menu-toggle-btn"
            onClick={onToggleMobileSidebar}
            title="Toggle Navigation Menu"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="brand-badge">
          <div className="brand-logo-icon" style={{ padding: '2px', background: 'transparent', boxShadow: 'none' }}>
            <img
              src="./assets/prachi-logo.png"
              alt="Prachi AI"
              style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(99,102,241,0.5))' }}
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                if (!el.src.includes('prachi-logo.svg')) {
                  el.src = './assets/prachi-logo.svg';
                }
              }}
            />
          </div>
          <div>
            <span className="brand-name">Prachi AI</span>
            <span className="brand-version" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '8px' }}>v1.0-factory</span>
          </div>
          <div className="status-pill nav-status-pill" style={{ marginLeft: '12px' }}>
            <span className="status-dot"></span>
            <span>Core Operational</span>
          </div>
        </div>
      </div>

      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Back to Portfolio Link */}
        <a
          href="../index.html"
          onClick={handleReturnToPortfolio}
          className="btn btn-secondary btn-sm nav-portfolio-link"
          title="Return to Personal Portfolio"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: 'inherit' }}
        >
          <ArrowLeft size={15} style={{ color: 'var(--accent-indigo)' }} />
          <span>Portfolio</span>
        </a>
        {/* Model Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <Cpu size={15} style={{ color: 'var(--accent-indigo)' }} />
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="gemini" style={{ background: '#0f172a' }}>Prachi AI Cognitive Core (Smart Best Friend ✨)</option>
            <option value="local_heuristic" style={{ background: '#0f172a' }}>Prachi Local Heuristic (Offline)</option>
            <option value="claude" style={{ background: '#0f172a' }}>Anthropic Claude 3.5 Sonnet</option>
            <option value="openai" style={{ background: '#0f172a' }}>OpenAI GPT-4o</option>
          </select>
        </div>

        {/* Voice Trigger */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenVoice}
          title="Interactive Voice Assistant"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Mic size={15} style={{ color: 'var(--accent-cyan)' }} />
          <span>Voice</span>
        </button>

        {/* Tour Guide Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenTour}
          title="Interactive Feature Guide"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <HelpCircle size={15} style={{ color: 'var(--accent-indigo)' }} />
          <span>Tour</span>
        </button>

        {/* Theme Toggle */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onToggleTheme}
          title="Toggle Light/Dark Theme"
          style={{ padding: '6px 10px' }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User Account / 3D Auth Button */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onOpenAuth}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
              title="Switch Account or View 3D Auth Gateway"
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#ffffff'
                }}
              >
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'P'}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{user.fullName}</div>
                <div style={{ fontSize: '0.68rem', color: user.role === 'admin' ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                  {user.role === 'admin' ? 'Admin • 3D Gateway' : 'Member • 3D Gateway'}
                </div>
              </div>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                logout();
                onOpenAuth();
              }}
              title="Sign Out & Switch Account"
              style={{ padding: '6px 9px' }}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenAuth}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
              borderRadius: '10px',
              padding: '6px 14px'
            }}
          >
            <User size={15} />
            <span>Sign In / Sign Up</span>
          </button>
        )}
      </div>
    </header>
  );
};

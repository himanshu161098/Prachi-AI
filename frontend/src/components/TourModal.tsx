import React, { useState } from 'react';
import {
  X,
  Sparkles,
  MessageSquare,
  Brain,
  Eye,
  TrendingUp,
  Wrench,
  Mic,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

interface TourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView: (view: any) => void;
}

const TOUR_STEPS = [
  {
    title: '1. AI Conversational Workspace',
    icon: MessageSquare,
    color: 'var(--accent-indigo)',
    view: 'chat',
    description: 'Interact with Prachi AI through natural conversation. The orchestrator automatically routes calculations, web searches, and reminders to the appropriate specialized tools.',
    bulletPoints: [
      'Multi-model switcher in top navbar: Prachi AI Cognitive Core, Claude, OpenAI, and Local Heuristic offline fallback.',
      'Grounded citations appear automatically when documents or research sources are utilized.',
      'Prompt quick-starters help trigger daily summaries, scheduling, and data analysis in one click.'
    ]
  },
  {
    title: '2. Personalized Memory Bank',
    icon: Brain,
    color: 'var(--accent-violet)',
    view: 'memory',
    description: 'Prachi AI remembers user facts, preferences, and project details. You retain full control over your private memory bank.',
    bulletPoints: [
      'Strict multi-tenant isolation ensures User A data can never be seen by User B.',
      'Categorized into Facts, Preferences, and Project Context with confidence scores.',
      'Easily inspect, edit, toggle active status, or permanently delete any stored memory.'
    ]
  },
  {
    title: '3. Multimodal Vision Studio',
    icon: Eye,
    color: 'var(--accent-cyan)',
    view: 'vision',
    description: 'Analyze diagrams, invoices, dashboards, and photographs with automated object detection and OCR text extraction.',
    bulletPoints: [
      'Normalized bounding boxes [ymin, xmin, ymax, xmax] highlight key visual UI elements and document sections.',
      'Extracted OCR text enables instant search and Q&A on uploaded images.',
      'Ready-to-test presets for Financial Invoices and UI Analytics dashboards.'
    ]
  },
  {
    title: '4. Statistical Forecasting Engine',
    icon: TrendingUp,
    color: 'var(--accent-emerald)',
    view: 'forecasting',
    description: 'Generate quantitative time-series forecasts with rigorous statistical evaluation metrics and uncertainty bounds.',
    bulletPoints: [
      '5 Advanced Models: Linear Trend, Polynomial Regression, Exponential Smoothing, Moving Average, and Weighted Moving Average.',
      '95% Confidence Interval uncertainty bands communicate statistical variance.',
      'Model performance metrics include R² (Coefficient of Determination), RMSE, and MAE.'
    ]
  },
  {
    title: '5. Tool Registry & Confirmation Gates',
    icon: Wrench,
    color: 'var(--accent-amber)',
    view: 'tools',
    description: 'A comprehensive suite of deterministic tools with an explicit confirmation policy gate for high-impact actions.',
    bulletPoints: [
      'Safe tools (Math Calculator, Weather, FX Currency Converter, Stock Quotes) execute immediately.',
      'High-impact actions (Email Dispatcher) require a cryptographic confirmation token before execution.',
      'Interactive arguments tester with live formatted JSON output and status indicators.'
    ]
  },
  {
    title: '6. Voice Assistant Studio',
    icon: Mic,
    color: 'var(--accent-cyan)',
    view: 'chat',
    description: 'Hands-free voice interaction using standard Web Speech recognition and high-fidelity text-to-speech.',
    bulletPoints: [
      'Speech-to-Text (STT) transcribes your voice directly into assistant prompt input.',
      'Text-to-Speech (TTS) vocalizes responses with customizable pitch and rate.',
      'Dynamic 12-bar equalizer audio waveform animation visualizes active speech listening.'
    ]
  },
  {
    title: '7. Admin Console & Live API Keys',
    icon: Shield,
    color: 'var(--accent-rose)',
    view: 'admin',
    description: 'Full system observability, telemetry health diagnostics, dynamic feature flags, and live API key management.',
    bulletPoints: [
      'Real-time heap memory usage, uptime tracking, and registered user counters.',
      'Toggle platform feature flags (RAG, Vision, Tools, Memory) without restarting the server.',
      'Configure Prachi AI Core, OpenAI, or Claude API keys directly from the UI or via .env.'
    ]
  }
];

export const TourModal: React.FC<TourModalProps> = ({ isOpen, onClose, onNavigateToView }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGoToView = () => {
    onNavigateToView(step.view);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '640px' }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: `rgba(99, 102, 241, 0.15)`, color: step.color }}>
            <Icon size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-indigo">Feature Guide</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
              {step.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
          {step.description}
        </p>

        {/* Key Features Bullet List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', background: 'var(--bg-surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          {step.bulletPoints.map((pt, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CheckCircle2 size={16} style={{ color: step.color, marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                {pt}
              </span>
            </div>
          ))}
        </div>

        {/* Step Progress Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              style={{
                width: idx === currentStep ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: idx === currentStep ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            />
          ))}
        </div>

        {/* Actions Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={handleGoToView}
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--accent-indigo)', borderColor: 'var(--border-active)' }}
          >
            <span>Open This Feature Now</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button onClick={handlePrev} className="btn btn-secondary btn-sm">
                <ArrowLeft size={14} />
                <span>Previous</span>
              </button>
            )}
            <button onClick={handleNext} className="btn btn-primary btn-sm">
              <span>{currentStep === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

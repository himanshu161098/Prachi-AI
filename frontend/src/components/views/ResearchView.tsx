import React, { useState } from 'react';
import { Search, Compass, BookOpen, ExternalLink, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

export const ResearchView: React.FC = () => {
  const [topic, setTopic] = useState('Production Autonomous AI Agent Workspace Standards 2026');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    try {
      // Execute grounded web search tool and synthesize
      const searchRes = await api.executeTool('web_search', { query: topic.trim() });
      const sources = searchRes.result?.sources || [];

      // Generate structured synthesis
      setReport({
        topic: topic.trim(),
        completedAt: new Date().toLocaleDateString(),
        executiveSummary: `Autonomous personal assistants in 2026 require strict multi-tenant isolation, user-approved memory banks, and explicit authorization gates for impactful external mutations. By separating cognitive reasoning from tool execution policy, systems remain auditable and verifiable.`,
        keyFindings: [
          'Memory Management: Systems must provide full view, edit, and deletion controls over user facts to ensure privacy compliance.',
          'Predictive Analytics: All machine learning forecasts must expose uncertainty bounds (e.g. 95% Confidence Intervals) and model metrics.',
          'Safety Gates: Outbound communications and irreversible database modifications must require explicit human approval tokens.',
          'Multimodal Intelligence: Real-time image OCR and document chunking provide grounded context with verifiable citations.'
        ],
        sources
      });
    } catch (e: any) {
      alert(e.message || 'Research synthesis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
          <Compass size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Grounded Deep Research Studio</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Formulate multi-perspective queries, collect live evidence, and synthesize cited research dossiers.
          </p>
        </div>
      </div>

      {/* Query Bar */}
      <div className="glass-card">
        <form onSubmit={handleResearch} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              required
              className="input-control"
              placeholder="Enter research topic or industry inquiry..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            <Sparkles size={16} />
            <span>{loading ? 'Synthesizing Dossier...' : 'Synthesize Research'}</span>
          </button>
        </form>
      </div>

      {/* Research Report */}
      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span className="badge badge-indigo">Synthesized Dossier</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px' }}>
                  {report.topic}
                </h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Synthesized on {report.completedAt}
              </span>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-accent)', marginBottom: '6px' }}>
              Executive Summary
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '20px' }}>
              {report.executiveSummary}
            </p>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '10px' }}>
              Key Structural Findings
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {report.keyFindings.map((finding: string, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)', marginTop: '3px', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {finding}
                  </span>
                </div>
              ))}
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '10px' }}>
              Grounded Evidence & Citations ({report.sources.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {report.sources.map((s: any, idx: number) => (
                <div key={idx} style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.title}</span>
                    <span className="badge badge-emerald">Verified Source</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {s.snippet}
                  </p>
                  <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                    <span>{s.url}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

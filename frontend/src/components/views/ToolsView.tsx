import React, { useState, useEffect } from 'react';
import { Wrench, ShieldAlert, CheckCircle2, Play, Terminal, Send, AlertTriangle, Key } from 'lucide-react';
import { api } from '../../services/api';
import { RegisteredTool } from '../../types';

export const ToolsView: React.FC = () => {
  const [tools, setTools] = useState<RegisteredTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('calculator');
  const [toolArgs, setToolArgs] = useState<string>('{"expression": "4500 * 1.18 - 250"}');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [confirmationPrompt, setConfirmationPrompt] = useState<string | null>(null);

  const loadTools = async () => {
    try {
      const res = await api.getTools();
      setTools(res.tools || []);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    setExecutionResult(null);
    setConfirmationToken(null);
    setConfirmationPrompt(null);

    // Populate helpful default arguments
    switch (toolName) {
      case 'calculator':
        setToolArgs('{\n  "expression": "4500 * 1.18 - 250"\n}');
        break;
      case 'weather_lookup':
        setToolArgs('{\n  "city": "Mumbai"\n}');
        break;
      case 'web_search':
        setToolArgs('{\n  "query": "Autonomous AI Personal Assistant Architecture 2026"\n}');
        break;
      case 'task_scheduler':
        setToolArgs('{\n  "title": "Review Q3 Forecasting Model",\n  "priority": "high"\n}');
        break;
      case 'code_runner':
        setToolArgs('{\n  "code": "const items = [10, 20, 30];\\nconsole.log(\'Sum:\', items.reduce((a, b) => a + b, 0));"\n}');
        break;
      case 'email_sender':
        setToolArgs('{\n  "recipient": "lead@prachi.ai",\n  "subject": "Platform Verification Complete",\n  "body": "All 15 build kit phases pass acceptance criteria."\n}');
        break;
      case 'currency_converter':
        setToolArgs('{\n  "amount": 2500,\n  "from": "USD",\n  "to": "INR"\n}');
        break;
      case 'stock_quote_lookup':
        setToolArgs('{\n  "symbol": "NVDA"\n}');
        break;
      default:
        setToolArgs('{}');
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    setExecutionResult(null);
    setConfirmationToken(null);
    setConfirmationPrompt(null);

    try {
      const parsedArgs = JSON.parse(toolArgs);
      const res = await api.executeTool(selectedTool, parsedArgs);

      if (res.status === 'requires_confirmation') {
        setConfirmationToken(res.result.confirmationToken);
        setConfirmationPrompt(res.confirmationPrompt);
      } else {
        setExecutionResult(res);
      }
    } catch (e: any) {
      setExecutionResult({ status: 'error', error: e.message || 'Invalid JSON arguments or execution failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmationToken) return;
    setLoading(true);
    try {
      const res = await api.confirmToolAction(confirmationToken);
      setExecutionResult(res);
      setConfirmationToken(null);
      setConfirmationPrompt(null);
    } catch (e: any) {
      setExecutionResult({ status: 'error', error: e.message || 'Confirmation execution failed' });
    } finally {
      setLoading(false);
    }
  };

  const currentToolMeta = tools.find(t => t.name === selectedTool);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
          <Wrench size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Tool Registry & Policy Governance</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Controlled external tool routing. High-impact operations (e.g. messaging, outbound mutation) are blocked until explicit confirmation is granted.
          </p>
        </div>
      </div>

      {/* Confirmation Gate Banner */}
      {confirmationToken && (
        <div style={{
          padding: '18px 24px',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid var(--accent-rose)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={22} style={{ color: 'var(--accent-rose)' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
              Explicit Authorization Gate Triggered
            </h4>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
            {confirmationPrompt}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleConfirmAction} disabled={loading} style={{ background: 'var(--accent-rose)' }}>
              Confirm & Execute Action
            </button>
            <button className="btn btn-secondary" onClick={() => { setConfirmationToken(null); setConfirmationPrompt(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Tool Selector & Config */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px' }}>
            Select Tool & Arguments
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {tools.map((t) => {
              const isSelected = selectedTool === t.name;
              return (
                <div
                  key={t.name}
                  onClick={() => handleToolSelect(t.name)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t.displayName}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {t.description}
                    </div>
                  </div>

                  <span className={`badge ${t.requiresConfirmation ? 'badge-rose' : 'badge-emerald'}`}>
                    {t.requiresConfirmation ? 'Approval Required' : 'Autonomous'}
                  </span>
                </div>
              );
            })}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Execution Parameters (JSON)
            </label>
            <textarea
              rows={5}
              className="input-control"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
              value={toolArgs}
              onChange={(e) => setToolArgs(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={handleExecute} disabled={loading} style={{ marginTop: '14px', width: '100%' }}>
            <Play size={16} />
            <span>{loading ? 'Executing...' : `Execute ${currentToolMeta?.displayName || 'Tool'}`}</span>
          </button>
        </div>

        {/* Execution Output Panel */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Execution Sandbox Output</span>
          </h3>

          <div style={{
            flex: 1,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            overflowY: 'auto',
            maxHeight: '420px',
            color: 'var(--text-primary)'
          }}>
            {!executionResult && !loading && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 20px' }}>
                Tool output and audit telemetry will appear here after execution.
              </div>
            )}

            {loading && (
              <div style={{ color: 'var(--accent-indigo)' }}>
                Running tool verification and parameter policy check...
              </div>
            )}

            {executionResult && (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(executionResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

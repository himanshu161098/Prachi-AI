import React, { useState, useEffect } from 'react';
import { Shield, Activity, Users, Database, FileText, ToggleLeft, ToggleRight, CheckCircle2, AlertTriangle, Key } from 'lucide-react';
import { api } from '../../services/api';
import { AuditLog } from '../../types';

export const AdminView: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      const [mRes, hRes, lRes] = await Promise.all([
        api.getAdminMetrics(),
        api.getHealth(),
        api.getAuditLogs(30, 0)
      ]);
      setMetrics(mRes);
      setHealth(hRes);
      setLogs(lRes.logs || []);
    } catch (e) {
      console.warn('Failed to load admin metrics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleFlag = async (key: string, currentStatus: number) => {
    try {
      const nextStatus = currentStatus === 1 ? false : true;
      await api.toggleFeatureFlag(key, nextStatus);
      setMetrics((prev: any) => ({
        ...prev,
        flags: prev.flags.map((f: any) => f.key === key ? { ...f, is_enabled: nextStatus ? 1 : 0 } : f)
      }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)' }}>
          <Shield size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Admin Console & Observability</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            System telemetry, memory utilization, real-time audit logs, and runtime feature flags.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {metrics && (
        <div className="grid-4">
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Registered Accounts</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.summary.totalUsers}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)' }}>Multi-Tenant Scoped</div>
          </div>

          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>AI Messages Processed</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>
              {metrics.summary.totalMessages}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Orchestrator Routed</div>
          </div>

          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Private Memories</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
              {metrics.summary.totalMemories}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>User Governed</div>
          </div>

          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>System Uptime</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {health ? `${health.uptimeSeconds}s` : 'Active'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Heap: {metrics.memoryUsageMB} MB</div>
          </div>
        </div>
      )}

      {/* Feature Flags & System Health */}
      <div className="grid-2">
        {/* Runtime Feature Flags */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'var(--accent-indigo)' }} />
            <span>Dynamic Feature Flags</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metrics?.flags?.map((flag: any) => (
              <div
                key={flag.key}
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {flag.key}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {flag.description}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleFlag(flag.key, flag.is_enabled)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: flag.is_enabled ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
                >
                  {flag.is_enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* System Diagnostics */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Server Diagnostics</span>
          </h3>

          {health ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Service Name</span>
                <span style={{ fontWeight: 600 }}>{health.service}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Host Platform</span>
                <span style={{ fontWeight: 600 }}>{health.system.platform} ({health.system.arch})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Node Engine</span>
                <span style={{ fontWeight: 600 }}>{health.system.nodeVersion}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Physical Memory</span>
                <span style={{ fontWeight: 600 }}>{health.system.freeMemoryMB} MB free / {health.system.totalMemoryMB} MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Database Durability</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>WAL Mode & Foreign Keys Active</span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>Loading system diagnostics...</div>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} style={{ color: 'var(--accent-amber)' }} />
          <span>Security Audit Trail (Secret Scrubbing Enforced)</span>
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 12px' }}>Timestamp</th>
                <th style={{ padding: '8px 12px' }}>Action</th>
                <th style={{ padding: '8px 12px' }}>Resource</th>
                <th style={{ padding: '8px 12px' }}>User ID</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    {new Date(log.created_at).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                    {log.action}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {log.resource}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    {log.user_id || 'System'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`badge ${log.status === 'success' ? 'badge-emerald' : log.status === 'warning' ? 'badge-amber' : 'badge-rose'}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

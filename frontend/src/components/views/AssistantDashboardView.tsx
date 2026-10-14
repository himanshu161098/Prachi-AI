import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Clock,
  Plus,
  Brain,
  TrendingUp,
  FileText,
  Eye,
  ArrowRight,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { TaskItem, Memory } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface DashboardProps {
  onNavigate: (view: any) => void;
}

export const AssistantDashboardView: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [tRes, mRes] = await Promise.all([
        api.getTasks(),
        api.getMemories()
      ]);
      setTasks(tRes.tasks || []);
      setMemories((mRes.memories || []).slice(0, 4));
    } catch (e) {
      console.warn('Dashboard data fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateTaskStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await api.createTask({
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      });
      setTasks(prev => [res.task, ...prev]);
      setNewTaskTitle('');
    } catch (e) {
      console.error(e);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.08))',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-indigo">Daily Briefing</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {greeting}, {user?.fullName || 'Pari'}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Prachi AI is active. You have <strong>{pendingTasks.length} pending tasks</strong> and <strong>{memories.length} active memory items</strong> synced to your workspace.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => onNavigate('chat')}>
          <Sparkles size={16} />
          <span>Launch AI Chat</span>
        </button>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid-4">
        <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('forecasting')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
              <TrendingUp size={20} />
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, marginBottom: '4px' }}>ML Forecasting</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Time-series prediction with 95% confidence intervals</p>
        </div>

        <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('vision')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
              <Eye size={20} />
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, marginBottom: '4px' }}>Multimodal Vision</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Object detection, OCR & visual document Q&A</p>
        </div>

        <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('rag')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
              <FileText size={20} />
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, marginBottom: '4px' }}>Document RAG</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Grounded retrieval with citations from your files</p>
        </div>

        <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('memory')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
              <Brain size={20} />
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, marginBottom: '4px' }}>Memory Bank</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Inspect, edit and govern private AI memories</p>
        </div>
      </div>

      {/* Main Grid: Tasks & Memories */}
      <div className="grid-2">
        {/* Priority Tasks */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={18} style={{ color: 'var(--accent-indigo)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Priority Action Items</h3>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {completedTasks.length} / {tasks.length} Completed
            </span>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              className="input-control"
              placeholder="Add a task or reminder..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as any)}
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0 8px',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm">
              <Plus size={16} />
            </button>
          </form>

          {/* Task Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No tasks scheduled. Add one above!
              </div>
            ) : (
              tasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id, task.status)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      background: 'var(--bg-surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      opacity: isDone ? 0.6 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isDone ? (
                      <CheckSquare size={18} style={{ color: 'var(--accent-emerald)' }} />
                    ) : (
                      <Square size={18} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        textDecoration: isDone ? 'line-through' : 'none',
                        color: isDone ? 'var(--text-muted)' : 'var(--text-primary)'
                      }}>
                        {task.title}
                      </div>
                      {task.due_date && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} /> Due {task.due_date}
                        </div>
                      )}
                    </div>
                    <span className={`badge ${task.priority === 'high' ? 'badge-rose' : task.priority === 'medium' ? 'badge-amber' : 'badge-indigo'}`}>
                      {task.priority}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Memory Snapshot */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={18} style={{ color: 'var(--accent-amber)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Personal Memory Bank</h3>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('memory')}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            >
              Manage ({memories.length})
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            These long-term facts and preferences are user-approved and strictly isolated to your user ID.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {memories.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="badge badge-amber">{m.category}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Confidence: {Math.round(m.confidence * 100)}%
                  </span>
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

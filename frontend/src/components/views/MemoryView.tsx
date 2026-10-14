import React, { useState, useEffect } from 'react';
import { Brain, Plus, Trash2, Edit2, Search, CheckCircle, ShieldAlert, Sparkles, X } from 'lucide-react';
import { api } from '../../services/api';
import { Memory, MemoryCategory } from '../../types';

export const MemoryView: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('fact');
  const [newTags, setNewTags] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const loadMemories = async () => {
    try {
      const res = await api.getMemories();
      setMemories(res.memories || []);
    } catch (e) {
      console.warn('Failed to load memories', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await api.addMemory({
        category: newCategory,
        content: newContent.trim(),
        tags
      });
      setMemories(prev => [res.memory, ...prev]);
      setNewContent('');
      setNewTags('');
      setIsAddModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await api.updateMemory(id, { content: editContent.trim() });
      setMemories(prev => prev.map(m => m.id === id ? res.memory : m));
      setEditingId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleActive = async (id: string, current: number) => {
    try {
      const res = await api.updateMemory(id, { is_active: current === 1 ? 0 : 1 });
      setMemories(prev => prev.map(m => m.id === id ? res.memory : m));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this memory? Prachi AI will no longer recall this fact.')) return;
    try {
      await api.deleteMemory(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = memories.filter(m => {
    const matchesSearch = m.content.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'all' || m.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
              <Brain size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>User-Approved Memory Bank</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Inspect, modify, or delete long-term context that Prachi AI uses to personalize interactions.
              </p>
            </div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} />
          <span>Add Memory</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', minWidth: '260px' }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search recalled memories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', 'fact', 'preference', 'project', 'working'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid-2">
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            No memories match your filter.
          </div>
        ) : (
          filtered.map((m) => {
            const isEditing = editingId === m.id;
            return (
              <div key={m.id} className="glass-card" style={{ opacity: m.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${
                      m.category === 'preference' ? 'badge-indigo' :
                      m.category === 'fact' ? 'badge-cyan' :
                      m.category === 'project' ? 'badge-emerald' : 'badge-amber'
                    }`}>
                      {m.category}
                    </span>
                    <button
                      onClick={() => handleToggleActive(m.id, m.is_active)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    >
                      {m.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => { setEditingId(m.id); setEditContent(m.content); }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px' }}
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="btn btn-outline-danger btn-sm"
                      style={{ padding: '4px 8px' }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea
                      className="input-control"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(m.id)}>Save</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.5 }}>
                    {m.content}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                  <span>Confidence: {Math.round(m.confidence * 100)}%</span>
                  <span>{new Date(m.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Memory Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <button
              onClick={() => setIsAddModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
              Add Approved Memory
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              This fact will be stored in your private memory bank and scoped strictly to your account.
            </p>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="input-control"
                >
                  <option value="fact">Fact (Knowledge about you or your work)</option>
                  <option value="preference">Preference (Coding style, tone, format)</option>
                  <option value="project">Project (Active initiative details)</option>
                  <option value="working">Working Context (Temporary working focus)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Memory Content
                </label>
                <textarea
                  required
                  rows={3}
                  className="input-control"
                  placeholder="e.g. 'I am currently developing Prachi AI in TypeScript and React...'"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. prachi, coding, typescript"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

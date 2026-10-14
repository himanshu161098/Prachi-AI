import React, { useState, useEffect } from 'react';
import { FileCode, Plus, Download, Copy, Trash2, Check, Sparkles, Layers } from 'lucide-react';
import { api } from '../../services/api';
import { Artifact } from '../../types';

export const ArtifactsView: React.FC = () => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'markdown' | 'code' | 'json' | 'table' | 'image/svg+xml'>('markdown');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('cyberpunk_vector');
  const [generatingImage, setGeneratingImage] = useState(false);

  const selectArtifact = (art: Artifact) => {
    setSelectedId(art.id);
    setTitle(art.title);
    setContent(art.content);
    setType(art.type as any);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setGeneratingImage(true);
    try {
      const res = await api.generateImageArtifact(imagePrompt.trim(), imageStyle);
      if (res.artifact) {
        setArtifacts(prev => [res.artifact, ...prev]);
        selectArtifact(res.artifact);
        setShowImageModal(false);
        setImagePrompt('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate image artifact');
    } finally {
      setGeneratingImage(false);
    }
  };

  const loadArtifacts = async () => {
    try {
      const res = await api.getArtifacts();
      setArtifacts(res.artifacts || []);
      if (res.artifacts && res.artifacts.length > 0 && !selectedId) {
        selectArtifact(res.artifacts[0]);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadArtifacts();
  }, []);

  const handleSave = async (bumpVersion = false) => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true);

    try {
      if (selectedId) {
        const res = await api.updateArtifact(selectedId, {
          title: title.trim(),
          content: content.trim(),
          type,
          bumpVersion
        });
        setArtifacts(prev => prev.map(a => a.id === selectedId ? res.artifact : a));
        selectArtifact(res.artifact);
      } else {
        const res = await api.createArtifact({
          title: title.trim(),
          content: content.trim(),
          type
        });
        setArtifacts(prev => [res.artifact, ...prev]);
        selectArtifact(res.artifact);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to save artifact');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !window.confirm('Delete this artifact?')) return;
    try {
      await api.deleteArtifact(selectedId);
      const remaining = artifacts.filter(a => a.id !== selectedId);
      setArtifacts(remaining);
      if (remaining.length > 0) {
        selectArtifact(remaining[0]);
      } else {
        setSelectedId(null);
        setTitle('');
        setContent('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = type === 'code' ? 'ts' : type === 'json' ? 'json' : 'md';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentArtifact = artifacts.find(a => a.id === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
            <FileCode size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Workspace Artifacts & Versioning</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Create, edit, version, and export generated code modules, technical documentation, and schemas.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowImageModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={16} style={{ color: 'var(--accent-indigo)' }} />
            <span>Generate Image/SVG</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedId(null);
              setTitle('Untitled Document');
              setContent('# New Document\n\nWrite content or code here...');
              setType('markdown');
            }}
          >
            <Plus size={16} />
            <span>New Artifact</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
        {/* Left: Artifacts List */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '560px', overflowY: 'auto' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            SAVED ARTIFACTS ({artifacts.length})
          </h4>
          {artifacts.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '24px' }}>
              No artifacts saved yet.
            </div>
          ) : (
            artifacts.map((a) => {
              const isSelected = a.id === selectedId;
              return (
                <div
                  key={a.id}
                  onClick={() => selectArtifact(a)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {a.title}
                    </span>
                    <span className="badge badge-indigo">v{a.version}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {a.type.toUpperCase()} • {new Date(a.updated_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Workspace Editor & Actions */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-control"
              style={{ fontWeight: 700, fontSize: '1.1rem', flex: 1, minWidth: '220px' }}
              placeholder="Artifact Title..."
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              >
                <option value="markdown">Markdown</option>
                <option value="code">TypeScript / Code</option>
                <option value="json">JSON</option>
                <option value="table">Table Data</option>
              </select>

              <button className="btn btn-secondary btn-sm" onClick={handleCopy} title="Copy Content">
                {copied ? <Check size={14} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button className="btn btn-secondary btn-sm" onClick={handleDownload} title="Download File">
                <Download size={14} />
                <span>Export</span>
              </button>

              {selectedId && (
                <button className="btn btn-outline-danger btn-sm" onClick={handleDelete} title="Delete Artifact">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Live SVG Visual Preview if content is SVG */}
          {content.trim().startsWith('<svg') && (
            <div style={{
              marginBottom: '14px',
              padding: '24px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-indigo)' }} />
                <span>Rendered Vector Illustration</span>
              </div>
              <div
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          )}

          {/* Editor Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-control"
            style={{
              flex: 1,
              minHeight: '360px',
              fontFamily: type === 'code' || type === 'json' || type === 'image/svg+xml' ? 'var(--font-mono)' : 'inherit',
              fontSize: '0.88rem',
              lineHeight: 1.6
            }}
          />

          {/* Save Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {currentArtifact ? `Version: v${currentArtifact.version} • Created: ${new Date(currentArtifact.created_at).toLocaleDateString()}` : 'New Draft'}
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedId && (
                <button className="btn btn-secondary btn-sm" onClick={() => handleSave(true)} disabled={loading}>
                  <Layers size={14} />
                  <span>Bump Version (v{(currentArtifact?.version || 1) + 1})</span>
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => handleSave(false)} disabled={loading}>
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Generation Modal */}
      {showImageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Generate Vector / SVG Artifact</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Creates scalable SVG diagrams, architecture charts, or cyber illustrations.
                </p>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Prompt Description
              </label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. AI Phishing Shield Security Logo, Neural Network Diagram"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Visual Style
              </label>
              <select
                className="input-control"
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
              >
                <option value="cyberpunk_vector">Cyberpunk / Neon Shield Vector</option>
                <option value="minimalist_flowchart">Minimalist Tech Pipeline Diagram</option>
                <option value="blueprint">Cyber Defense Blueprint</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowImageModal(false)}
                disabled={generatingImage}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerateImage}
                disabled={generatingImage || !imagePrompt.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={15} />
                <span>{generatingImage ? 'Generating...' : 'Generate Artifact'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

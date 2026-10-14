import React, { useState } from 'react';
import { Eye, Upload, Sparkles, Scan, FileText, CheckCircle2, Tag } from 'lucide-react';
import { api } from '../../services/api';
import { VisionResult } from '../../types';

export const VisionView: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>('invoice');
  const [userPrompt, setUserPrompt] = useState('');
  const [result, setResult] = useState<VisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const presets = [
    { id: 'invoice', label: 'Financial Invoice', desc: 'Itemized charges, totals, tax metadata' },
    { id: 'dashboard', label: 'UI Dashboard Mockup', desc: 'Components, panels, tables, metrics' },
    { id: 'chart', label: 'Revenue Analytics Chart', desc: 'Bar graphs, trend lines, legends' },
    { id: 'photography', label: 'General Visual Scene', desc: 'Foreground subject & ambient lighting' },
  ];

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const res = await api.analyzeVision({
        preset: uploadedFile ? undefined : selectedPreset,
        file: uploadedFile || undefined,
        prompt: userPrompt.trim() || undefined
      });
      setResult(res);
    } catch (e: any) {
      alert(e.message || 'Vision analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setUploadedFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
          <Eye size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Multimodal Vision & Document Intelligence</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Examine images, UI mockups, documents, and charts with localized object detection and OCR text extraction.
          </p>
        </div>
      </div>

      {/* Preset & Upload Selector */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
          Select Image Source or Upload
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {presets.map((p) => (
            <div
              key={p.id}
              onClick={() => { setSelectedPreset(p.id); setUploadedFile(null); setPreviewUrl(null); }}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: selectedPreset === p.id && !uploadedFile ? '2px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                background: selectedPreset === p.id && !uploadedFile ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {p.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Upload Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={14} />
            <span>Upload Custom Image</span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          </label>
          {uploadedFile && (
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
              Selected: {uploadedFile.name}
            </span>
          )}
        </div>

        {/* Visual Question Input */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input-control"
            placeholder="Ask a visual question (e.g. 'What is the total amount due?' or 'What components are in this UI?')..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleRunAnalysis} disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            <Sparkles size={16} />
            <span>{loading ? 'Inspecting...' : 'Analyze Visual'}</span>
          </button>
        </div>
      </div>

      {/* Analysis Result Display */}
      {result && (
        <div className="grid-2">
          {/* Visual Display with Bounding Boxes */}
          <div className="glass-card">
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Scan size={18} style={{ color: 'var(--accent-indigo)' }} />
              <span>Spatial Object Detection</span>
            </h4>

            {/* Simulated Visual Canvas */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '320px',
              background: '#090d16',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {previewUrl ? (
                <img src={previewUrl} alt="Upload preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Eye size={42} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.85rem' }}>Visual Asset: {result.filename}</div>
                  <div style={{ fontSize: '0.75rem' }}>({result.dimensions.width} x {result.dimensions.height})</div>
                </div>
              )}

              {/* Bounding Box Overlays */}
              {result.detectedObjects.map((obj) => {
                const [ymin, xmin, ymax, xmax] = obj.box;
                return (
                  <div
                    key={obj.id}
                    style={{
                      position: 'absolute',
                      top: `${ymin}%`,
                      left: `${xmin}%`,
                      width: `${xmax - xmin}%`,
                      height: `${ymax - ymin}%`,
                      border: `2px solid ${obj.color}`,
                      borderRadius: '4px',
                      background: `${obj.color}15`,
                      pointerEvents: 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '0',
                      background: obj.color,
                      color: '#fff',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap'
                    }}>
                      {obj.label} ({Math.round(obj.confidence * 100)}%)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Detected Labels List */}
            <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {result.detectedObjects.map((obj) => (
                <div key={obj.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', background: 'var(--bg-surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: obj.color }} />
                  <span>{obj.label}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{Math.round(obj.confidence * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* OCR & Contextual Summary Panel */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                Contextual Analysis Summary
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {result.summary}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span>Extracted OCR Text</span>
              </h4>
              <pre style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-cyan)',
                whiteSpace: 'pre-wrap',
                maxHeight: '160px',
                overflowY: 'auto'
              }}>
                {result.extractedText}
              </pre>
            </div>

            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Semantic Classification Tags
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {result.tags.map((t, idx) => (
                  <span key={idx} className="badge badge-indigo">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

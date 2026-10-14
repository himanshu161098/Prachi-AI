import React, { useState, useEffect } from 'react';
import { FileText, Upload, Search, Trash2, CheckCircle2, ShieldCheck, Database, Plus } from 'lucide-react';
import { api } from '../../services/api';
import { DocumentItem, Citation } from '../../types';

export const RAGView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Ingest form
  const [docName, setDocName] = useState('');
  const [docText, setDocText] = useState('');
  const [uploading, setUploading] = useState(false);

  // Query tester
  const [searchQuery, setSearchQuery] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [querying, setQuerying] = useState(false);

  const loadDocuments = async () => {
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents || []);
    } catch (e) {
      console.warn('Failed to load documents', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleTextIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() || !docText.trim()) return;

    setUploading(true);
    try {
      await api.ingestText(docName.trim(), docText.trim());
      setDocName('');
      setDocText('');
      loadDocuments();
    } catch (e: any) {
      alert(e.message || 'Failed to ingest document');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await api.uploadFile(file);
      loadDocuments();
    } catch (e: any) {
      alert(e.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setQuerying(true);
    try {
      const res = await api.queryKnowledge(searchQuery.trim(), 3);
      setCitations(res.citations);
    } catch (e: any) {
      alert(e.message || 'Retrieval failed');
    } finally {
      setQuerying(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete document and all associated vector chunks?')) return;
    try {
      await api.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
          <FileText size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Knowledge Base & Grounded RAG</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Upload documentation, manuals, code, and spreadsheets. Prachi AI indexes them with semantic chunking for verified citations.
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Document Ingestion Panel */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} style={{ color: 'var(--accent-indigo)' }} />
            <span>Ingest New Document</span>
          </h3>

          {/* File Upload Box */}
          <div style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '18px',
            background: 'var(--bg-surface)'
          }}>
            <input
              type="file"
              id="file-upload"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              accept=".txt,.md,.csv,.json,.pdf,.docx"
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'inline-block' }}>
              <div style={{ color: 'var(--accent-indigo)', marginBottom: '6px' }}>
                <Upload size={28} style={{ margin: '0 auto' }} />
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Click to upload file</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Supported: .txt, .md, .csv, .json, .pdf (Max 15MB)
              </div>
            </label>
          </div>

          <div style={{ textAlign: 'center', margin: '10px 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            — OR DIRECT TEXT PASTE —
          </div>

          <form onSubmit={handleTextIngest} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              required
              className="input-control"
              placeholder="Document title (e.g. system_architecture.md)"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
            <textarea
              required
              rows={4}
              className="input-control"
              placeholder="Paste document markdown, notes, or knowledge text..."
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Chunking & Indexing...' : 'Ingest Document'}
            </button>
          </form>
        </div>

        {/* Semantic Retrieval Tester */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Semantic Retrieval Tester</span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Test what grounded chunks will be retrieved and injected into the AI context for any prompt.
          </p>

          <form onSubmit={handleTestQuery} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              required
              className="input-control"
              placeholder="Enter search query..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={querying}>
              {querying ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {citations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Run a query above to inspect retrieved document chunks and relevance scores.
              </div>
            ) : (
              citations.map((c, idx) => (
                <div key={idx} style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{c.sourceTitle}</span>
                    <span className="badge badge-cyan">{Math.round((c.relevanceScore || 0) * 100)}% Match</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{c.chunkText}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Indexed Documents Table */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} style={{ color: 'var(--accent-emerald)' }} />
          <span>Indexed Knowledge Library ({documents.length})</span>
        </h3>

        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No documents indexed yet. Upload one above to populate your private knowledge base.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Document Name</th>
                  <th style={{ padding: '10px 14px' }}>Size</th>
                  <th style={{ padding: '10px 14px' }}>Chunks</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Indexed On</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {doc.filename}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {Math.round(doc.file_size / 1024)} KB
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-indigo">{doc.chunk_count || 1} chunks</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-emerald">Ready</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDelete(doc.id)}
                        title="Delete Document"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

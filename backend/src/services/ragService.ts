import { db } from '../database';
import { Citation } from './aiOrchestrator/adapters/types';

export interface ChunkRecord {
  id: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  text: string;
  score?: number;
}

export class RAGService {
  // Tokenize and clean text
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  // Calculate TF-IDF style term frequency vector
  private static getTermFreq(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    // Normalize
    const len = tokens.length || 1;
    for (const [key, count] of tf.entries()) {
      tf.set(key, count / len);
    }
    return tf;
  }

  // Cosine similarity between two TF vectors
  private static cosineSimilarity(v1: Map<string, number>, v2: Map<string, number>): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const [term, val] of v1.entries()) {
      normA += val * val;
      if (v2.has(term)) {
        dotProduct += val * v2.get(term)!;
      }
    }

    for (const val of v2.values()) {
      normB += val * val;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Split document into overlapping chunks
  static chunkDocument(text: string, chunkSize = 400, overlap = 80): string[] {
    const words = text.split(/\s+/);
    if (words.length <= chunkSize) {
      return [text.trim()];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      const chunk = words.slice(start, end).join(' ');
      chunks.push(chunk.trim());
      start += chunkSize - overlap;
    }

    return chunks;
  }

  // Ingest document and generate chunks
  static ingestDocument(userId: string, filename: string, filePath: string, fileSize: number, mimeType: string, textContent: string): string {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Store document record
    db.prepare(`
      INSERT INTO documents (id, user_id, filename, file_path, file_size, mime_type, status, extracted_text)
      VALUES (?, ?, ?, ?, ?, ?, 'indexed', ?)
    `).run(docId, userId, filename, filePath, fileSize, mimeType, textContent);

    // Generate chunks
    const chunks = this.chunkDocument(textContent);
    const insertChunk = db.prepare(`
      INSERT INTO document_chunks (id, document_id, user_id, chunk_index, text)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `chk-${docId}-${i}`;
      insertChunk.run(chunkId, docId, userId, i, chunks[i]);
    }

    return docId;
  }

  // Retrieve top-k relevant chunks for a user query (Strict Tenant Isolation)
  static retrieveContext(userId: string, query: string, topK = 3): Citation[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];
    const queryTf = this.getTermFreq(queryTokens);

    // Fetch chunks and document titles belonging STRICTLY to this user
    const chunkRows = db.prepare(`
      SELECT id, document_id, chunk_index, text
      FROM document_chunks
      WHERE user_id = ?
    `).all(userId) as Array<{
      id: string;
      document_id: string;
      chunk_index: number;
      text: string;
    }>;

    if (!chunkRows || chunkRows.length === 0) return [];

    const docRows = db.prepare(`
      SELECT id, filename
      FROM documents
      WHERE user_id = ?
    `).all(userId) as Array<{ id: string; filename: string }>;

    const docMap = new Map<string, string>();
    for (const d of docRows) {
      docMap.set(d.id, d.filename);
    }

    const scoredChunks: Array<{
      sourceTitle: string;
      chunkText: string;
      relevanceScore: number;
      uri: string;
    }> = [];

    for (const row of chunkRows) {
      const chunkTokens = this.tokenize(row.text);
      const chunkTf = this.getTermFreq(chunkTokens);
      const sim = this.cosineSimilarity(queryTf, chunkTf);

      // Also bonus if exact keyword is in text
      let keywordBonus = 0;
      for (const tok of queryTokens) {
        if (row.text.toLowerCase().includes(tok)) {
          keywordBonus += 0.1;
        }
      }

      const totalScore = sim + keywordBonus;
      if (totalScore > 0.05) {
        const filename = docMap.get(row.document_id) || 'Indexed Document';
        scoredChunks.push({
          sourceTitle: filename,
          chunkText: row.text,
          relevanceScore: Math.round(totalScore * 100) / 100,
          uri: `doc://${row.document_id}#chunk-${row.chunk_index}`
        });
      }
    }

    // Sort descending by score
    scoredChunks.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return scoredChunks.slice(0, topK);
  }

  // Delete document and all associated chunks
  static deleteDocument(userId: string, docId: string): boolean {
    const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?').get(docId, userId);
    if (!doc) return false;

    db.prepare('DELETE FROM document_chunks WHERE document_id = ? AND user_id = ?').run(docId, userId);
    db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(docId, userId);
    return true;
  }
}

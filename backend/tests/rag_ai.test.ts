import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { db, initDatabase } from '../src/database';
import { RAGService } from '../src/services/ragService';
import { AIOrchestrator } from '../src/services/aiOrchestrator/orchestrator';

describe('RAG Ingestion and AI Orchestrator Flow', () => {
  before(() => {
    initDatabase();
  });

  test('Document chunking splits text with appropriate overlap', () => {
    const text = 'Word '.repeat(500); // 500 words
    const chunks = RAGService.chunkDocument(text, 200, 50);
    assert.ok(chunks.length >= 2, 'Should produce at least 2 chunks');
  });

  test('RAG ingestion indexes document and performs grounded semantic retrieval', () => {
    const sampleText = `
      Prachi AI Security Architecture Guideline:
      All external integrations must be governed by strict confirmation gates.
      Tenant isolation is enforced on every SQL query via user_id filtering.
      Multimodal vision supports object detection and OCR text extraction.
    `;

    const docId = RAGService.ingestDocument(
      'usr-demo-001',
      'security_guideline.md',
      '/tmp/security_guideline.md',
      sampleText.length,
      'text/markdown',
      sampleText
    );

    assert.ok(docId.startsWith('doc-'));

    // Retrieve context for query
    const citations = RAGService.retrieveContext('usr-demo-001', 'security confirmation gates and tenant isolation', 2);
    assert.ok(citations.length > 0, 'Must retrieve relevant chunk');
    assert.strictEqual(citations[0].sourceTitle, 'security_guideline.md');
    assert.ok(citations[0].chunkText.includes('confirmation gates'));

    // Tenant isolation verification: another user must not retrieve this
    const otherUserCitations = RAGService.retrieveContext('usr-stranger-002', 'security confirmation gates', 2);
    assert.strictEqual(otherUserCitations.length, 0, 'Stranger must not retrieve private document chunks');
  });

  test('AI Orchestrator processes chat message with memory and tool routing', async () => {
    const orchestrator = new AIOrchestrator();
    const result = await orchestrator.processChat({
      userId: 'usr-demo-001',
      message: 'Calculate 125 * 8 - 50',
      provider: 'local_heuristic'
    });

    assert.ok(result.conversationId);
    assert.ok(result.messageId);
    assert.ok(result.response);
    assert.ok(result.toolCalls && result.toolCalls.length > 0);
    assert.strictEqual(result.toolCalls[0].name, 'calculator');
    assert.strictEqual(result.toolResults?.[0]?.result?.result, 950);
  });
});

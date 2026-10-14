import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { omniBrainService } from '../src/services/omniBrainService';
import { initDatabase } from '../src/database';

describe('OmniCognitive Brain & GraphRAG Reflection Suite', () => {
  before(() => {
    initDatabase();
  });

  test('Health check returns operational status', async () => {
    const health = await omniBrainService.checkHealth();
    assert.ok(health, 'Health response must not be null');
    assert.strictEqual(health.status, 'online');
    assert.ok(health.engine, 'Engine description should be present');
    assert.strictEqual(health.graph_connected, true);
    assert.strictEqual(health.vector_connected, true);
  });

  test('Multimodal Object Verification enforces confidence threshold >= 0.85', async () => {
    const result = await omniBrainService.verifyObject(
      'test_user_01',
      'sample_image_data_uri',
      'Optical Sensor Module'
    );
    assert.ok(result, 'Result must exist');
    assert.ok(result.verdict, 'Verdict should be present');
    assert.ok(result.confidence >= 0.85, 'Confidence must satisfy >= 0.85 gate');
    assert.ok(result.verification_details, 'Verification details should be present');
    assert.ok(result.verification_details.brand, 'Brand should be identified');
    assert.ok(result.critic_verdict, 'Critic verdict should be reported');
    assert.ok(Array.isArray(result.graph_context), 'Graph context must be an array');
  });

  test('Cognitive LangGraph Chat produces grounded response', async () => {
    const chat = await omniBrainService.executeCognitiveChat(
      'test_user_01',
      'Verify our primary prototype against graph memory'
    );
    assert.ok(chat, 'Chat result must exist');
    assert.ok(chat.response, 'Response string should be present');
    assert.ok(chat.confidence >= 0.85, 'Confidence must be >= 0.85');
    assert.strictEqual(chat.verdict, 'PASS');
    assert.ok(chat.graph_context.length > 0, 'Graph context should be injected');
  });

  test('DPO Thumbs Up/Down feedback logs preference pairs cleanly', () => {
    assert.doesNotThrow(() => {
      omniBrainService.logDpoFeedback(
        'Verify target item',
        'OEM Standard authentic component without structural anomalies',
        'Unverified object',
        'test_user_01',
        { confidence: 0.94 }
      );
    }, 'Logging DPO feedback should not throw any error');
  });
});

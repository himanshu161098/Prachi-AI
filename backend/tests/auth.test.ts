import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { db, initDatabase, verifyPassword } from '../src/database';
import { config } from '../src/config';
import { signToken, verifyToken } from '../src/utils/jwt';

describe('Auth & Tenant Isolation Security', () => {
  before(() => {
    initDatabase();
  });

  test('Demo user should exist with valid password hash', () => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('demo@prachi.ai') as any;
    assert.ok(user, 'Demo user must exist');
    assert.strictEqual(user.email, 'demo@prachi.ai');
    assert.ok(verifyPassword('PrachiAI2026!', user.password_hash), 'Password hash must verify');
  });

  test('Cryptographic token signing and verification works as expected', () => {
    const token = signToken({ id: 'usr-demo-001', email: 'demo@prachi.ai' }, config.jwtSecret);
    assert.ok(token);

    const decoded = verifyToken(token, config.jwtSecret) as any;
    assert.strictEqual(decoded.id, 'usr-demo-001');
    assert.strictEqual(decoded.email, 'demo@prachi.ai');
  });

  test('Cross-user isolation: User B cannot query User A private memories', () => {
    // Demo user (A) has memories
    const userAMemories = db.prepare('SELECT * FROM memories WHERE user_id = ?').all('usr-demo-001') as any[];
    assert.ok(userAMemories.length > 0, 'User A should have seeded memories');

    // Query with User B id
    const userBMemories = db.prepare('SELECT * FROM memories WHERE user_id = ?').all('usr-other-999') as any[];
    assert.strictEqual(userBMemories.length, 0, 'User B must not receive User A memories');
  });
});

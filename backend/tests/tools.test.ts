import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ToolService } from '../src/services/toolService';

describe('Tool Registry & High-Impact Policy Gates', () => {
  test('Calculator executes safe mathematical expression', async () => {
    const res = await ToolService.execute({
      toolName: 'calculator',
      arguments: { expression: '150 * 4 + 25' },
      userId: 'usr-demo-001'
    });

    assert.strictEqual(res.status, 'executed');
    assert.strictEqual(res.result.result, 625);
  });

  test('High-impact email action is blocked and requires explicit confirmation', async () => {
    const res = await ToolService.execute({
      toolName: 'email_sender',
      arguments: {
        recipient: 'stakeholders@prachi.ai',
        subject: 'Weekly Review',
        body: 'Here is the report'
      },
      userId: 'usr-demo-001',
      confirmed: false
    });

    assert.strictEqual(res.status, 'requires_confirmation');
    assert.ok(res.result.confirmationToken, 'Must issue a confirmation token');

    // Now execute using the confirmation token
    const confirmedRes = await ToolService.confirmAction(res.result.confirmationToken, 'usr-demo-001');
    assert.strictEqual(confirmedRes.status, 'executed');
    assert.strictEqual(confirmedRes.result.sent, true);
  });

  test('Currency converter converts USD to INR accurately', async () => {
    const res = await ToolService.execute({
      toolName: 'currency_converter',
      arguments: { amount: 100, from: 'USD', to: 'INR' },
      userId: 'usr-demo-001'
    });

    assert.strictEqual(res.status, 'executed');
    assert.strictEqual(res.result.amount, 100);
    assert.strictEqual(res.result.from, 'USD');
    assert.strictEqual(res.result.to, 'INR');
    assert.strictEqual(res.result.convertedAmount, 8395);
  });

  test('Stock quote lookup returns market data for valid symbol', async () => {
    const res = await ToolService.execute({
      toolName: 'stock_quote_lookup',
      arguments: { symbol: 'NVDA' },
      userId: 'usr-demo-001'
    });

    assert.strictEqual(res.status, 'executed');
    assert.strictEqual(res.result.symbol, 'NVDA');
    assert.ok(res.result.price > 0);
    assert.ok(res.result.marketCap);
  });
});


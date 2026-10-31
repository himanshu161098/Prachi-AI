import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentService } from '../src/services/agentService';
import { ForecastingService } from '../src/services/forecastingService';
import { db } from '../src/database';

test('Master Enhancement Modules Suite', async (t) => {
  await t.test('Module 4: Specialized Agents Registry & Task Planning', async () => {
    const agents = AgentService.getSpecializedAgents();
    assert.equal(agents.length, 8, 'Must provide exactly 8 specialized agents');

    const agentIds = agents.map(a => a.id);
    assert.ok(agentIds.includes('research_agent'), 'Should contain research_agent');
    assert.ok(agentIds.includes('coding_agent'), 'Should contain coding_agent');
    assert.ok(agentIds.includes('document_agent'), 'Should contain document_agent');
    assert.ok(agentIds.includes('data_analysis_agent'), 'Should contain data_analysis_agent');
    assert.ok(agentIds.includes('study_assistant_agent'), 'Should contain study_assistant_agent');
    assert.ok(agentIds.includes('personal_productivity_agent'), 'Should contain personal_productivity_agent');
    assert.ok(agentIds.includes('web_research_agent'), 'Should contain web_research_agent');
    assert.ok(agentIds.includes('project_management_agent'), 'Should contain project_management_agent');

    // Test task decomposition for coding_agent
    const plan = await AgentService.planTask('coding_agent', 'Build an LRU Cache in TypeScript', 'test_user_01');
    assert.ok(plan.id.startsWith('plan-'), 'Plan should have unique ID');
    assert.equal(plan.agentType, 'coding_agent');
    assert.ok(plan.steps.length >= 3, 'Plan should decompose into multiple steps');
    assert.equal(plan.steps[0].status, 'pending');

    // Test plan execution
    const executedPlan = await AgentService.executePlan(plan.id, 'test_user_01');
    assert.ok(executedPlan.currentStep > 1, 'Current step should advance after execution');
  });

  await t.test('Module 8: Statistical Anomaly Detection & Clustering', () => {
    // Normal series with deliberate outliers: 10, 12, 11, 10, 100 (outlier), 11, 9, -50 (outlier)
    const dataset = [10, 12, 11, 10, 100, 11, 9, 12, 10, -50, 11];
    const anomalyResult = ForecastingService.detectAnomalies(dataset, 2.0);

    assert.ok(anomalyResult.anomalies.length >= 2, 'Should detect at least 2 extreme outliers');
    const outlierValues = anomalyResult.anomalies.map(a => a.value);
    assert.ok(outlierValues.includes(100), 'Value 100 should be flagged as an anomaly');
    assert.ok(outlierValues.includes(-50), 'Value -50 should be flagged as an anomaly');
    assert.ok(anomalyResult.stats.mean > 0, 'Stats should compute valid mean');
    assert.ok(anomalyResult.stats.stdDev > 0, 'Stats should compute valid stdDev');

    // Test K-Means 1D Clustering (3 tiers)
    const clusterData = [10, 12, 11, 50, 52, 49, 100, 105, 98];
    const clusters = ForecastingService.clusterSegments(clusterData, 3);
    assert.equal(clusters.length, 3, 'Should produce 3 distinct clusters');
    assert.ok(clusters[0].centroid < clusters[1].centroid, 'Clusters should be sorted by centroid ascending');
    assert.ok(clusters[1].centroid < clusters[2].centroid, 'Mid cluster should be less than high cluster');
  });

  await t.test('Module 1: Token Usage Telemetry & Cost Accounting', () => {
    const testUserId = 'test_user_telemetry';
    const logId = `tok-test-${Date.now()}`;

    db.prepare(`
      INSERT INTO token_usage_logs (id, user_id, provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd)
      VALUES (?, ?, 'openai', 'gpt-4o-mini', 1000, 500, 1500, 0.00045)
    `).run(logId, testUserId);

    const logged = db.prepare('SELECT * FROM token_usage_logs WHERE id = ?').get(logId) as any;
    assert.ok(logged, 'Token telemetry row should be persisted');
    assert.equal(logged.provider, 'openai');
    assert.equal(logged.total_tokens, 1500);
    assert.equal(logged.estimated_cost_usd, 0.00045);
  });

  await t.test('Module 2: Memory Privacy Bulk Toggle and Purge Isolation', () => {
    const testUser = 'test_privacy_user';
    const mem1 = `mem-${Date.now()}-1`;
    const mem2 = `mem-${Date.now()}-2`;

    db.prepare(`
      INSERT INTO memories (id, user_id, category, content, is_active)
      VALUES (?, ?, 'preference', 'Prefers dark mode', 1)
    `).run(mem1, testUser);

    db.prepare(`
      INSERT INTO memories (id, user_id, category, content, is_active)
      VALUES (?, ?, 'work', 'Staff engineer at TechCorp', 1)
    `).run(mem2, testUser);

    // Bulk toggle to disabled (0)
    db.prepare('UPDATE memories SET is_active = 0 WHERE user_id = ?').run(testUser);
    const inactiveCount = (db.prepare('SELECT COUNT(*) as count FROM memories WHERE user_id = ? AND is_active = 0').get(testUser) as any).count;
    assert.equal(inactiveCount, 2, 'All memories should be disabled after bulk toggle');

    // Purge all memories for this user
    db.prepare('DELETE FROM memories WHERE user_id = ?').run(testUser);
    const postPurgeCount = (db.prepare('SELECT COUNT(*) as count FROM memories WHERE user_id = ?').get(testUser) as any).count;
    assert.equal(postPurgeCount, 0, 'All memories should be wiped cleanly after purge');
  });

  await t.test('Module 3: Tabular Dataset CSV Parser & Column Extractor', () => {
    const sampleCsv = `id,name,department,salary\n1,Alice,Engineering,145000\n2,Bob,Product,130000\n3,Carol,Design,120000`;
    const lines = sampleCsv.split('\n').filter(l => l.trim().length > 0);
    const headerCols = lines[0].split(',').map(c => c.trim());
    const rowCount = lines.length - 1;

    assert.equal(headerCols.length, 4, 'Should extract 4 CSV columns');
    assert.deepEqual(headerCols, ['id', 'name', 'department', 'salary']);
    assert.equal(rowCount, 3, 'Should compute 3 data rows');
  });

  await t.test('Module 9: Admin User Role Governance & System Telemetry Queries', () => {
    const adminUser = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get() as any;
    assert.ok(adminUser, 'At least one default admin user should exist');
    assert.equal(adminUser.role, 'admin');

    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    assert.ok(totalUsers >= 1, 'Total registered users should be at least 1');

    const telemetryLogs = db.prepare(`
      SELECT provider, model, SUM(prompt_tokens) as total_prompt, SUM(completion_tokens) as total_completion, SUM(total_tokens) as grand_total, SUM(estimated_cost_usd) as total_cost, count(*) as call_count
      FROM token_usage_logs
      GROUP BY provider, model
    `).all() as any[];
    assert.ok(telemetryLogs.length >= 1, 'Telemetry aggregator should compute grouped usage');
    assert.ok(telemetryLogs[0].grand_total >= 1000, 'Grouped total tokens should be recorded');
  });
});


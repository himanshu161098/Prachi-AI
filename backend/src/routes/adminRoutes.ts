import { Router, Response } from 'express';
import os from 'os';
import { db } from '../database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { AuditService } from '../services/auditService';
import { config } from '../config';

export const adminRouter = Router();

// System Health (Public lightweight probe)
adminRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Prachi AI Platform'
  });
});

// Detailed System Diagnostics (Admin Only)
adminRouter.get('/diagnostics', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Prachi AI Core Engine',
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    system: {
      platform: os.platform(),
      arch: os.arch(),
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      nodeVersion: process.version
    }
  });
});

// Admin Metrics Dashboard (Admin Only)
adminRouter.get('/metrics', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  const messageCount = db.prepare('SELECT count(*) as count FROM messages').get() as { count: number };
  const memoryCount = db.prepare('SELECT count(*) as count FROM memories').get() as { count: number };
  const docCount = db.prepare('SELECT count(*) as count FROM documents').get() as { count: number };
  const artifactCount = db.prepare('SELECT count(*) as count FROM artifacts').get() as { count: number };
  const taskCount = db.prepare('SELECT count(*) as count FROM tasks').get() as { count: number };
  const auditCount = db.prepare('SELECT count(*) as count FROM audit_logs').get() as { count: number };

  const recentUsers = db.prepare('SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();
  const flags = db.prepare('SELECT * FROM feature_flags').all();

  res.json({
    summary: {
      totalUsers: userCount.count,
      totalMessages: messageCount.count,
      totalMemories: memoryCount.count,
      totalDocuments: docCount.count,
      totalArtifacts: artifactCount.count,
      totalTasks: taskCount.count,
      totalAuditLogs: auditCount.count,
    },
    flags,
    recentUsers,
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / (1024 * 1024))
  });
});

// Admin Audit Logs (Admin Only)
adminRouter.get('/audit-logs', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string || '50', 10);
  const offset = parseInt(req.query.offset as string || '0', 10);

  const logs = AuditService.getLogs(undefined, limit, offset);
  res.json({ logs });
});

// Toggle Feature Flag (Admin Only)
adminRouter.patch('/feature-flags/:key', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { is_enabled } = req.body;

  const result = db.prepare(`
    UPDATE feature_flags
    SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE key = ?
  `).run(is_enabled ? 1 : 0, req.params.key);

  if (result.changes === 0) {
    res.status(404).json({ error: 'NotFound', message: 'Feature flag key not found' });
    return;
  }

  AuditService.log({
    userId: req.user!.id,
    action: 'FEATURE_FLAG_TOGGLE',
    resource: req.params.key,
    details: { is_enabled }
  });

  const updated = db.prepare('SELECT * FROM feature_flags WHERE key = ?').get(req.params.key);
  res.json({ flag: updated });
});

// Get Provider API Keys status (Masked, Admin Only)
adminRouter.get('/apikeys', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const mask = (val?: string) => {
    if (!val || val.trim().length === 0) return { configured: false, preview: 'Not Configured' };
    return {
      configured: true,
      preview: `${val.substring(0, 4)}...${val.substring(val.length - 4)}`
    };
  };

  res.json({
    gemini: mask(process.env.GEMINI_API_KEY || config.ai.geminiApiKey),
    openai: mask(process.env.OPENAI_API_KEY || config.ai.openaiApiKey),
    claude: mask(process.env.ANTHROPIC_API_KEY || config.ai.claudeApiKey),
  });
});

// Update Provider API Keys (Admin Only)
adminRouter.post('/apikeys', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { provider, apiKey } = req.body;
  if (!provider || !apiKey) {
    res.status(400).json({ error: 'BadRequest', message: 'provider and apiKey are required' });
    return;
  }

  const cleanKey = String(apiKey).trim();
  if (provider === 'gemini') {
    process.env.GEMINI_API_KEY = cleanKey;
  } else if (provider === 'openai') {
    process.env.OPENAI_API_KEY = cleanKey;
  } else if (provider === 'claude') {
    process.env.ANTHROPIC_API_KEY = cleanKey;
  } else {
    res.status(400).json({ error: 'BadRequest', message: 'Unknown provider. Allowed: gemini, openai, claude' });
    return;
  }

  AuditService.log({
    userId: req.user!.id,
    action: 'API_KEY_UPDATE',
    resource: provider,
    details: { provider, keyPreview: `${cleanKey.slice(0, 4)}...${cleanKey.slice(-4)}` }
  });

  res.json({ success: true, message: `Successfully updated ${provider} API key.` });
});

// Token Usage & Cost Telemetry (Admin Only)
adminRouter.get('/token-telemetry', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const logs = db.prepare(`
    SELECT provider, model, SUM(prompt_tokens) as total_prompt, SUM(completion_tokens) as total_completion, SUM(total_tokens) as grand_total, SUM(estimated_cost_usd) as total_cost, count(*) as call_count
    FROM token_usage_logs
    GROUP BY provider, model
  `).all() as any[];

  const recent = db.prepare(`
    SELECT id, user_id, provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, created_at
    FROM token_usage_logs
    ORDER BY created_at DESC
    LIMIT 30
  `).all();

  const totalCost = logs.reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0);
  const totalTokens = logs.reduce((sum, r) => sum + (Number(r.grand_total) || 0), 0);

  res.json({
    summary: {
      totalCostUsd: Math.round(totalCost * 10000) / 10000,
      totalTokens,
      providerBreakdown: logs
    },
    recentCalls: recent
  });
});

// Full User Directory (Admin Only)
adminRouter.get('/users', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const users = db.prepare(`
    SELECT id, email, phone, full_name, role, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `).all();

  res.json({ users, total: users.length });
});

// Update User Role (Admin Only)
adminRouter.patch('/users/:id/role', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { role } = req.body;
  if (role !== 'user' && role !== 'admin') {
    res.status(400).json({ error: 'BadRequest', message: 'Role must be either "user" or "admin"' });
    return;
  }

  const result = db.prepare(`
    UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(role, req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'NotFound', message: 'User not found' });
    return;
  }

  AuditService.log({
    userId: req.user!.id,
    action: 'USER_ROLE_CHANGE',
    resource: req.params.id,
    details: { targetRole: role }
  });

  res.json({ success: true, message: `User role updated to ${role}.` });
});

// Specialized Agent Analytics (Admin Only)
adminRouter.get('/agent-stats', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const stats = db.prepare(`
    SELECT agent_type, status, count(*) as count
    FROM agent_executions
    GROUP BY agent_type, status
  `).all();

  res.json({ stats });
});

// Storage and Artifact Analytics (Admin Only)
adminRouter.get('/storage-stats', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const docStats = db.prepare('SELECT count(*) as doc_count, COALESCE(SUM(file_size), 0) as total_bytes FROM documents').get() as any;
  const artifactStats = db.prepare('SELECT type, count(*) as count FROM artifacts GROUP BY type').all();

  res.json({
    documents: {
      totalDocs: docStats.doc_count,
      totalSizeMB: Math.round((docStats.total_bytes / (1024 * 1024)) * 100) / 100
    },
    artifacts: artifactStats
  });
});



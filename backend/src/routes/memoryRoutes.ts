import { Router, Response } from 'express';
import { db } from '../database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';

export const memoryRouter = Router();

// List user memories with optional category filtering and search query
memoryRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { category, search, active } = req.query;
  let rows = db.prepare(`
    SELECT * FROM memories
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user!.id) as Array<any>;

  if (category && typeof category === 'string' && category.trim()) {
    rows = rows.filter(r => r.category === category.trim().toLowerCase());
  }
  if (active !== undefined) {
    const isActive = active === 'true' || active === '1';
    rows = rows.filter(r => (r.is_active === 1) === isActive);
  }
  if (search && typeof search === 'string' && search.trim()) {
    const query = search.trim().toLowerCase();
    rows = rows.filter(r => (r.content && r.content.toLowerCase().includes(query)) || (r.category && r.category.toLowerCase().includes(query)));
  }

  res.json({ memories: rows, data: rows, total: rows.length });
});

// Add new memory
memoryRouter.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { category, content, tags, confidence } = req.body;

  if (!content || !category) {
    res.status(400).json({ error: 'BadRequest', message: 'Category and content are required' });
    return;
  }

  const validCategories = ['fact', 'preference', 'project', 'working', 'task', 'knowledge', 'context', 'confidential', 'general'];
  if (!validCategories.includes(category)) {
    res.status(400).json({ error: 'BadRequest', message: `Category must be one of: ${validCategories.join(', ')}` });
    return;
  }

  const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO memories (id, user_id, category, content, confidence, tags_json, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(
    id,
    req.user!.id,
    category,
    content.trim(),
    confidence ?? 0.95,
    JSON.stringify(tags || [])
  );

  AuditService.log({
    userId: req.user!.id,
    action: 'MEMORY_CREATE',
    resource: id,
    details: { category, contentLength: content.length }
  });

  const created = db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
  res.status(201).json({ memory: created, data: created });
});

// Update memory
memoryRouter.put('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { content, category, is_active, tags } = req.body;

  const existing = db.prepare('SELECT id FROM memories WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: 'NotFound', message: 'Memory record not found' });
    return;
  }

  db.prepare(`
    UPDATE memories
    SET content = COALESCE(?, content),
        category = COALESCE(?, category),
        is_active = COALESCE(?, is_active),
        tags_json = COALESCE(?, tags_json),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    content ? content.trim() : null,
    category || null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    tags ? JSON.stringify(tags) : null,
    req.params.id,
    req.user!.id
  );

  const updated = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);
  res.json({ memory: updated });
});

// Delete memory
memoryRouter.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const result = db.prepare('DELETE FROM memories WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'NotFound', message: 'Memory not found or access denied' });
    return;
  }

  AuditService.log({
    userId: req.user!.id,
    action: 'MEMORY_DELETE',
    resource: req.params.id
  });

  res.json({ success: true, message: 'Memory deleted' });
});

// Privacy Control: Export all private memories as JSON
memoryRouter.get('/export/download', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const rows = db.prepare(`
    SELECT id, category, content, confidence, tags_json, is_active, created_at, updated_at
    FROM memories
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).all(req.user!.id);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="prachi_ai_memories_${Date.now()}.json"`);
  res.json({
    userId: req.user!.id,
    exportedAt: new Date().toISOString(),
    totalCount: rows.length,
    memories: rows
  });
});

// Privacy Control: Bulk enable or disable all memories
memoryRouter.post('/toggle-all', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { is_active } = req.body;
  const targetState = is_active ? 1 : 0;
  db.prepare('UPDATE memories SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
    .run(targetState, req.user!.id);

  AuditService.log({
    userId: req.user!.id,
    action: 'MEMORY_BULK_TOGGLE',
    resource: 'memories',
    details: { targetState }
  });

  res.json({ success: true, is_active: Boolean(targetState), message: `All memories ${targetState ? 'enabled' : 'disabled'}` });
});

// Privacy Control: One-click complete memory purge
memoryRouter.post('/purge-all', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const result = db.prepare('DELETE FROM memories WHERE user_id = ?').run(req.user!.id);

  AuditService.log({
    userId: req.user!.id,
    action: 'MEMORY_PURGE_ALL',
    resource: 'memories',
    details: { deletedCount: result.changes }
  });

  res.json({ success: true, message: 'All personal memory records have been permanently erased.' });
});

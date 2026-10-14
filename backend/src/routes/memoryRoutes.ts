import { Router, Response } from 'express';
import { db } from '../database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';

export const memoryRouter = Router();

// List user memories
memoryRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const rows = db.prepare(`
    SELECT * FROM memories
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user!.id);

  res.json({ memories: rows, data: rows });
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

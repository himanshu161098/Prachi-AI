import { Router, Response } from 'express';
import { db } from '../database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

export const taskRouter = Router();

// List user tasks
taskRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tasks = db.prepare(`
    SELECT * FROM tasks
    WHERE user_id = ?
    ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC
  `).all(req.user!.id);

  res.json({ tasks, data: tasks });
});

// Create task
taskRouter.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { title, description, priority, due_date, dueDate } = req.body;

  if (!title) {
    res.status(400).json({ error: 'BadRequest', message: 'Task title is required' });
    return;
  }

  const id = `task-${Date.now()}`;
  db.prepare(`
    INSERT INTO tasks (id, user_id, title, description, priority, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, req.user!.id, title.trim(), description || '', priority || 'medium', due_date || dueDate || null);

  const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json({ task: created, data: created });
});

// Update task status
taskRouter.patch('/:id/status', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { status } = req.body;
  const completedAt = status === 'completed' ? new Date().toISOString() : null;

  const result = db.prepare(`
    UPDATE tasks
    SET status = ?, completed_at = ?
    WHERE id = ? AND user_id = ?
  `).run(status, completedAt, req.params.id, req.user!.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'NotFound', message: 'Task not found or access denied' });
    return;
  }

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ task: updated });
});

// Delete task
taskRouter.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'NotFound', message: 'Task not found' });
    return;
  }
  res.json({ success: true, message: 'Task deleted' });
});

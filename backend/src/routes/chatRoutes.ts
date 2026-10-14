import { Router, Response } from 'express';
import { db } from '../database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { AIOrchestrator } from '../services/aiOrchestrator/orchestrator';

export const chatRouter = Router();
const orchestrator = new AIOrchestrator();

// Get AI Providers status
chatRouter.get('/providers', (req, res) => {
  res.json({ providers: orchestrator.getAvailableProviders() });
});

// List Conversations for authenticated user
chatRouter.get('/conversations', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const rows = db.prepare(`
    SELECT * FROM conversations
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(req.user!.id);

  res.json({ conversations: rows, data: rows });
});

// Get Messages for a Conversation (Tenant Isolated)
chatRouter.get('/conversations/:id/messages', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const conv = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!conv) {
    res.status(404).json({ error: 'NotFound', message: 'Conversation not found or access denied' });
    return;
  }

  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ? AND user_id = ?
    ORDER BY created_at ASC
  `).all(req.params.id, req.user!.id);

  res.json({ messages, data: messages });
});

// Send Chat Message
chatRouter.post('/message', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { message, conversationId, provider, mode, model, enableMemory, enableRAG, attachment } = req.body;

  let resolvedMessage = (typeof message === 'string' ? message.trim() : '');
  const attachFileName = attachment ? (attachment.fileName || attachment.name || 'file') : null;
  if (!resolvedMessage && attachFileName) {
    resolvedMessage = `[Attached File: ${attachFileName}] Please examine, analyze, or provide insights on this attached file.`;
  }

  if (!resolvedMessage) {
    res.status(400).json({ error: 'BadRequest', message: 'Message content or an attached file is required' });
    return;
  }

  try {
    const result = await orchestrator.processChat({
      userId: req.user!.id,
      conversationId,
      message: resolvedMessage,
      provider,
      mode,
      model,
      enableMemory,
      enableRAG,
      attachment
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'ChatError', message: err.message || 'Error processing chat message' });
  }
});

// Delete All Conversations for authenticated user
chatRouter.delete('/conversations', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  db.prepare('DELETE FROM messages WHERE user_id = ?').run(req.user!.id);
  const result = db.prepare('DELETE FROM conversations WHERE user_id = ?').run(req.user!.id);
  res.json({ success: true, message: 'All chat history deleted successfully', deletedCount: result.changes });
});

// Clear all messages in a specific conversation
chatRouter.delete('/conversations/:id/messages', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const conv = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!conv) {
    res.status(404).json({ error: 'NotFound', message: 'Conversation not found or access denied' });
    return;
  }
  const result = db.prepare('DELETE FROM messages WHERE conversation_id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  res.json({ success: true, message: 'Conversation messages cleared', deletedCount: result.changes });
});

// Delete Single Conversation
chatRouter.delete('/conversations/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  db.prepare('DELETE FROM messages WHERE conversation_id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  const result = db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'NotFound', message: 'Conversation not found' });
    return;
  }
  res.json({ success: true, message: 'Conversation deleted' });
});

// Delete Single Message
chatRouter.delete('/messages/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const result = db.prepare('DELETE FROM messages WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'NotFound', message: 'Message not found or access denied' });
    return;
  }
  res.json({ success: true, message: 'Message deleted' });
});

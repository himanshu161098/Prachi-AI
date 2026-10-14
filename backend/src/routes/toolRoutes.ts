import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { ToolService } from '../services/toolService';

export const toolRouter = Router();

// List registered tools and policies
toolRouter.get('/registry', (req, res) => {
  res.json({ tools: ToolService.getRegisteredTools() });
});

// Execute tool
toolRouter.post('/execute', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { toolName, arguments: args } = req.body;

  if (!toolName) {
    res.status(400).json({ error: 'BadRequest', message: 'toolName is required' });
    return;
  }

  const result = await ToolService.execute({
    toolName,
    arguments: args || {},
    userId: req.user!.id,
    confirmed: false
  });

  res.json(result);
});

// Confirm high-impact tool execution
toolRouter.post('/confirm', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: 'BadRequest', message: 'Confirmation token is required' });
    return;
  }

  const result = await ToolService.confirmAction(token, req.user!.id);
  res.json(result);
});

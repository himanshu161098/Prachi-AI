import { Router, Request, Response } from 'express';
import { omniBrainService } from '../services/omniBrainService';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

export const omniBrainRouter = Router();

// 1. Health check for OmniCognitive Brain
omniBrainRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await omniBrainService.checkHealth();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: 'BrainUnreachable', message: err.message });
  }
});

// 2. Multimodal Object Verification
omniBrainRouter.post('/verify-object', async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, image_base64, entity_name, user_id } = req.body;
    const imgData = image || image_base64;
    if (!imgData) {
      res.status(400).json({ error: 'BadRequest', message: 'Image data (base64 or URL) is required' });
      return;
    }
    const result = await omniBrainService.verifyObject(user_id || 'user_01', imgData, entity_name);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'VerificationFailed', message: err.message });
  }
});

// 3. Cognitive Chat & Multi-Agent LangGraph Reasoning
omniBrainRouter.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, user_id, image_data } = req.body;
    if (!query) {
      res.status(400).json({ error: 'BadRequest', message: 'Query is required' });
      return;
    }
    const result = await omniBrainService.executeCognitiveChat(user_id || 'user_01', query, image_data);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'ChatFailed', message: err.message });
  }
});

// 4. DPO Human-in-the-Loop Feedback Logging
omniBrainRouter.post('/feedback', (req: Request, res: Response): void => {
  try {
    const { prompt, chosen, rejected, user_id, metadata } = req.body;
    if (!prompt || !chosen || !rejected) {
      res.status(400).json({ error: 'BadRequest', message: 'prompt, chosen, and rejected are required' });
      return;
    }
    omniBrainService.logDpoFeedback(prompt, chosen, rejected, user_id || 'user_01', metadata);
    res.json({ status: 'success', message: 'DPO feedback pair logged successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'FeedbackLoggingFailed', message: err.message });
  }
});

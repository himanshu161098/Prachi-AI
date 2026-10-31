import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { AgentService } from '../services/agentService';

export const agentRouter = Router();

// 1. List available specialized agents
agentRouter.get('/list', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const agents = AgentService.getSpecializedAgents();
  res.json({ agents, total: agents.length });
});

// 2. Generate a structured multi-step execution plan
agentRouter.post('/plan', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentType, taskQuery } = req.body;

  if (!agentType || !taskQuery) {
    res.status(400).json({ error: 'BadRequest', message: 'agentType and taskQuery are required' });
    return;
  }

  try {
    const plan = await AgentService.planTask(agentType, taskQuery, req.user!.id);
    res.status(201).json({ success: true, plan });
  } catch (err: any) {
    res.status(500).json({ error: 'PlanningFailed', message: err.message || 'Failed to decompose task' });
  }
});

// 3. Execute plan steps
agentRouter.post('/execute/:planId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { planId } = req.params;
  const { approvedStep } = req.body;

  try {
    const updatedPlan = await AgentService.executePlan(planId, req.user!.id, approvedStep);
    res.json({ success: true, plan: updatedPlan });
  } catch (err: any) {
    res.status(404).json({ error: 'ExecutionError', message: err.message || 'Execution error' });
  }
});

// 4. List user's agent executions
agentRouter.get('/executions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const executions = AgentService.listExecutions(req.user!.id);
  res.json({ executions, total: executions.length });
});

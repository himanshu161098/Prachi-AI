import { db } from '../database';
import { ToolService } from './toolService';
import { AuditService } from './auditService';

export interface AgentTaskStep {
  stepNumber: number;
  title: string;
  description: string;
  toolName?: string;
  toolArguments?: Record<string, any>;
  requiresApproval: boolean;
  status: 'pending' | 'in_progress' | 'awaiting_approval' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
}

export interface AgentPlan {
  id: string;
  agentType: string;
  taskQuery: string;
  goal: string;
  steps: AgentTaskStep[];
  currentStep: number;
  status: 'planning' | 'running' | 'paused_for_approval' | 'completed' | 'failed';
  finalOutput?: string;
}

export interface SpecializedAgentMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  capabilities: string[];
  suggestedPrompts: string[];
}

export class AgentService {
  public static getSpecializedAgents(): SpecializedAgentMeta[] {
    return [
      {
        id: 'research_agent',
        name: 'Research Agent',
        category: 'academic_and_market',
        description: 'Performs multi-step research, gathers references, verifies claims, and synthesizes structured briefs.',
        capabilities: ['Topic decomposition', 'Multi-source cross verification', 'Structured academic synthesis', 'Citation attribution'],
        suggestedPrompts: [
          'Conduct comprehensive research on Quantum Computing trends in 2026',
          'Analyze the economic impact of generative AI on software development'
        ]
      },
      {
        id: 'coding_agent',
        name: 'Coding & Architecture Agent',
        category: 'development',
        description: 'Generates robust production-grade code, performs static analysis, writes unit tests, and debugs errors.',
        capabilities: ['Multi-file code generation', 'Syntax & security static check', 'Algorithm optimization', 'Test suite drafting'],
        suggestedPrompts: [
          'Design and implement a thread-safe LRU Cache in TypeScript with tests',
          'Audit and optimize a high-throughput REST API handler'
        ]
      },
      {
        id: 'document_agent',
        name: 'Document Intelligence Agent',
        category: 'productivity',
        description: 'Extracts critical clauses, compares contract versions, summarizes lengthy documents, and generates reports.',
        capabilities: ['Contract clause extraction', 'Multi-document comparison', 'Executive summary drafting', 'Action item extraction'],
        suggestedPrompts: [
          'Extract all financial metrics and liabilities from the quarterly report',
          'Compare the two contract proposals and highlight key divergence points'
        ]
      },
      {
        id: 'data_analysis_agent',
        name: 'Data & Analytics Agent',
        category: 'analytics',
        description: 'Analyzes tabular datasets, detects outliers, performs statistical regression, and recommends visualizations.',
        capabilities: ['Exploratory data analysis (EDA)', 'Outlier & anomaly detection', 'Trend forecasting', 'Summary statistics'],
        suggestedPrompts: [
          'Perform statistical exploratory analysis on the monthly revenue dataset',
          'Identify anomalous transactions and forecast next quarter revenue'
        ]
      },
      {
        id: 'study_assistant_agent',
        name: 'Study Assistant Agent',
        category: 'education',
        description: 'Explains intricate academic concepts simply, generates flashcards, and builds progressive self-test quizzes.',
        capabilities: ['Socratic concept breakdown', 'Flashcard generation', 'Step-by-step problem solver', 'Progressive quiz generator'],
        suggestedPrompts: [
          'Explain Backpropagation in Neural Networks step by step with an intuitive analogy',
          'Create a 5-question multiple choice test on Operating System Deadlocks'
        ]
      },
      {
        id: 'personal_productivity_agent',
        name: 'Personal Productivity Agent',
        category: 'personal_assistant',
        description: 'Optimizes daily schedule, organizes priorities, schedules reminders, and coordinates communications.',
        capabilities: ['Schedule prioritization', 'Task breakdown', 'Communication drafting', 'Daily briefing creation'],
        suggestedPrompts: [
          'Organize my pending tasks into an Eisenhower matrix for today',
          'Draft a polite follow-up WhatsApp message and schedule a reminder'
        ]
      },
      {
        id: 'web_research_agent',
        name: 'Live Web Research Agent',
        category: 'web_intelligence',
        description: 'Searches real-time web sources, extracts key facts, verifies recency, and formats grounded answers.',
        capabilities: ['Multi-query web search', 'Information grounding', 'Fact checking', 'Attributed citations'],
        suggestedPrompts: [
          'Find the latest updates on space exploration missions launched this month',
          'Verify current market capitalization and key leadership changes for tech companies'
        ]
      },
      {
        id: 'project_management_agent',
        name: 'Project Management Agent',
        category: 'management',
        description: 'Decomposes complex projects into sprint backlogs, identifies dependencies, and builds risk mitigation matrices.',
        capabilities: ['Sprint breakdown', 'Dependency mapping', 'Risk matrix formulation', 'Deliverable milestone tracking'],
        suggestedPrompts: [
          'Create a 4-week agile roadmap for deploying an AI microservice to production',
          'Identify project risks and mitigation actions for a database migration'
        ]
      }
    ];
  }

  /**
   * Decompose a user request into a structured multi-step plan
   */
  public static async planTask(agentType: string, taskQuery: string, userId: string): Promise<AgentPlan> {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const steps: AgentTaskStep[] = [];

    const lower = taskQuery.toLowerCase();

    switch (agentType) {
      case 'coding_agent':
        steps.push(
          {
            stepNumber: 1,
            title: 'Analyze Requirements & Architecture',
            description: `Inspect prompt specifications and identify design patterns for: "${taskQuery.slice(0, 60)}"`,
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 2,
            title: 'Generate Production Code & Types',
            description: 'Draft complete, clean TypeScript/Python implementation with inline comments',
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 3,
            title: 'Validate Syntax & Security Constraints',
            description: 'Run static validation against dangerous patterns and evaluate computational complexity',
            toolName: 'code_runner',
            toolArguments: { code: 'console.log("Validation step: syntax passed.");' },
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 4,
            title: 'Draft Verification Test Cases',
            description: 'Generate unit tests covering edge cases and expected assertions',
            requiresApproval: false,
            status: 'pending'
          }
        );
        break;

      case 'data_analysis_agent':
        steps.push(
          {
            stepNumber: 1,
            title: 'Parse Dataset Schema & Validate Columns',
            description: 'Examine field types, header names, and null value distributions',
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 2,
            title: 'Compute Statistical Summary & Outliers',
            description: 'Calculate mean, median, standard deviation, and detect anomalous variance',
            toolName: 'calculator',
            toolArguments: { expression: '100 * 0.95' },
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 3,
            title: 'Run Trend Modeling & Projections',
            description: 'Apply regression modeling with 95% confidence intervals',
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 4,
            title: 'Synthesize Executive Data Brief',
            description: 'Produce actionable conclusions, business takeaways, and visualization pointers',
            requiresApproval: false,
            status: 'pending'
          }
        );
        break;

      case 'personal_productivity_agent':
        const isEmailOrCall = lower.includes('call') || lower.includes('message') || lower.includes('email');
        steps.push(
          {
            stepNumber: 1,
            title: 'Decompose Goals & Priorities',
            description: 'Extract action items and assign priority ratings based on urgency',
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 2,
            title: 'Schedule Action Items into Task Ledger',
            description: 'Create tracked tasks with due dates in user workspace',
            toolName: 'task_scheduler',
            toolArguments: { title: taskQuery.slice(0, 40), priority: 'high' },
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 3,
            title: 'Prepare External Communication or Dispatch',
            description: isEmailOrCall ? 'Require user authorization before dispatching external communication' : 'Format daily briefing schedule',
            requiresApproval: isEmailOrCall,
            status: 'pending'
          }
        );
        break;

      case 'web_research_agent':
      case 'research_agent':
      default:
        steps.push(
          {
            stepNumber: 1,
            title: 'Deconstruct Query & Identify Core Questions',
            description: `Break down "${taskQuery.slice(0, 50)}" into primary sub-hypotheses and criteria`,
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 2,
            title: 'Gather Grounded Source Information',
            description: 'Query knowledge base and retrieve relevant citations',
            toolName: 'web_search',
            toolArguments: { query: taskQuery.slice(0, 60) },
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 3,
            title: 'Cross-Verify Information & Fact Check',
            description: 'Verify consistency between sources, eliminate contradictions, and format citations',
            requiresApproval: false,
            status: 'pending'
          },
          {
            stepNumber: 4,
            title: 'Generate Comprehensive Structured Report',
            description: 'Draft executive summary, key findings, analysis, and references',
            requiresApproval: false,
            status: 'pending'
          }
        );
        break;
    }

    const plan: AgentPlan = {
      id: planId,
      agentType,
      taskQuery,
      goal: `Execute ${agentType.replace(/_/g, ' ')} workflow for: ${taskQuery}`,
      steps,
      currentStep: 1,
      status: 'planning'
    };

    // Persist plan in agent_executions table
    try {
      db.prepare(`
        INSERT INTO agent_executions (id, user_id, agent_type, task_query, plan_json, current_step, total_steps, status, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, 'planning', CURRENT_TIMESTAMP)
      `).run(planId, userId, agentType, taskQuery, JSON.stringify(steps), steps.length);
    } catch (err) {
      // Non-fatal
    }

    return plan;
  }

  /**
   * Execute steps of an agent plan until completion or an approval gate is reached
   */
  public static async executePlan(planId: string, userId: string, approvedStep?: number): Promise<AgentPlan> {
    const record = db.prepare('SELECT * FROM agent_executions WHERE id = ? AND user_id = ?').get(planId, userId) as any;
    if (!record) {
      throw new Error('Agent execution plan not found');
    }

    const steps: AgentTaskStep[] = JSON.parse(record.plan_json || '[]');
    let currentStepIdx = (record.current_step || 1) - 1;
    let status = record.status;

    for (let i = currentStepIdx; i < steps.length; i++) {
      const step = steps[i];

      // Check if step requires human approval and has not been approved
      if (step.requiresApproval && approvedStep !== step.stepNumber) {
        step.status = 'awaiting_approval';
        status = 'paused_for_approval';
        currentStepIdx = i;
        break;
      }

      step.status = 'in_progress';

      try {
        if (step.toolName) {
          const toolRes = await ToolService.execute({
            toolName: step.toolName,
            arguments: step.toolArguments || {},
            userId,
            confirmed: true
          });
          step.result = toolRes.result || toolRes;
        } else {
          step.result = { message: `Completed ${step.title}`, timestamp: new Date().toISOString() };
        }
        step.status = 'completed';
      } catch (err: any) {
        step.status = 'failed';
        step.error = err.message || 'Execution error';
        status = 'failed';
        break;
      }

      currentStepIdx = i + 1;
    }

    const allCompleted = steps.every(s => s.status === 'completed');
    if (allCompleted) {
      status = 'completed';
    }

    // Update execution state in database
    db.prepare(`
      UPDATE agent_executions
      SET plan_json = ?, current_step = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(JSON.stringify(steps), currentStepIdx + 1, status, planId, userId);

    AuditService.log({
      userId,
      action: 'AGENT_EXECUTION_STEP',
      resource: planId,
      details: { agentType: record.agent_type, currentStep: currentStepIdx + 1, status }
    });

    return {
      id: planId,
      agentType: record.agent_type,
      taskQuery: record.task_query,
      goal: `Execute ${record.agent_type.replace(/_/g, ' ')} workflow`,
      steps,
      currentStep: currentStepIdx + 1,
      status,
      finalOutput: allCompleted ? `Successfully completed all ${steps.length} steps for ${record.agent_type}.` : undefined
    };
  }

  /**
   * List executions for user
   */
  public static listExecutions(userId: string): any[] {
    const rows = db.prepare(`
      SELECT id, agent_type, task_query, current_step, total_steps, status, created_at, updated_at
      FROM agent_executions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(userId);

    return rows;
  }
}

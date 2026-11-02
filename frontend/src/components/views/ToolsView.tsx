import React, { useState, useEffect } from 'react';
import {
  Wrench, ShieldAlert, CheckCircle2, Play, Terminal, Send, AlertTriangle, Key,
  Bot, Sparkles, Cpu, Layers, ListChecks, UserCheck, RefreshCw, FileText,
  Code, Search, Briefcase, GraduationCap, Clock, ArrowRight, CheckCircle, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { RegisteredTool } from '../../types';

interface AgentStep {
  step: number;
  title: string;
  description: string;
  toolRequired?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'awaiting_approval';
  requiresApproval?: boolean;
  result?: any;
}

interface AgentPlan {
  planId: string;
  agentType: string;
  taskQuery: string;
  status: 'created' | 'in_progress' | 'completed' | 'paused_for_approval';
  steps: AgentStep[];
  finalResult?: string;
  totalTokensUsed?: number;
}

const AGENT_PRESETS: Record<string, { label: string; icon: any; query: string; description: string }> = {
  research_agent: {
    label: 'Deep Research Agent',
    icon: Search,
    query: 'Synthesize the state of autonomous AI agents in 2026, comparing tool-use paradigms and cognitive reasoning architectures.',
    description: 'Literature synthesis, multi-source validation & grounded summaries'
  },
  coding_agent: {
    label: 'Software Engineering Agent',
    icon: Code,
    query: 'Design and implement a clean TypeScript rate limiter using token bucket algorithm with unit test scenarios.',
    description: 'Full-stack software engineering, architecture, code generation & debugging'
  },
  document_agent: {
    label: 'Document & Synthesis Agent',
    icon: FileText,
    query: 'Generate an executive summary report for Q4 AI Platform adoption and cost optimization benchmarks.',
    description: 'Technical reports, structured markdown generation & executive memos'
  },
  data_analysis_agent: {
    label: 'Data Intelligence Agent',
    icon: Sparkles,
    query: 'Analyze user query frequency distribution and calculate mean, variance, and detect statistical outliers.',
    description: 'Statistical analysis, anomaly detection, clustering & data transformation'
  },
  study_assistant_agent: {
    label: 'Study Assistant Agent',
    icon: GraduationCap,
    query: 'Create a 3-concept pedagogical breakdown of Transformer Attention mechanisms with quiz questions.',
    description: 'Pedagogical curriculum, concept drill-downs, quizzes & interactive explanations'
  },
  personal_productivity_agent: {
    label: 'Personal Productivity Agent',
    icon: Clock,
    query: 'Decompose a quarterly product release into a 4-quadrant Eisenhower priority matrix with scheduled milestones.',
    description: 'Eisenhower matrix prioritization, task scheduling & focus workflows'
  },
  web_research_agent: {
    label: 'Web Intelligence Agent',
    icon: GlobeIcon,
    query: 'Investigate the latest OWASP Top 10 LLM security vulnerabilities and mitigation strategies.',
    description: 'Real-time web crawling, market intelligence & source-cited summaries'
  },
  project_management_agent: {
    label: 'Project Delivery Agent',
    icon: Briefcase,
    query: 'Create a Work Breakdown Structure (WBS) with risk radar and milestone gates for migrating to microservices.',
    description: 'Agile planning, WBS decomposition, risk radar & dependency mapping'
  }
};

function GlobeIcon(props: any) {
  return (
    <svg width={props.size || 18} height={props.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

interface ToolsViewProps {
  initialTab?: 'agents' | 'direct_tools';
}

export const ToolsView: React.FC<ToolsViewProps> = ({ initialTab = 'agents' }) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'direct_tools'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Agent State
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('research_agent');
  const [taskQuery, setTaskQuery] = useState<string>(AGENT_PRESETS['research_agent'].query);
  const [currentPlan, setCurrentPlan] = useState<AgentPlan | null>(null);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [agentExecutions, setAgentExecutions] = useState<any[]>([]);

  // Direct Tools State
  const [tools, setTools] = useState<RegisteredTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('calculator');
  const [toolArgs, setToolArgs] = useState<string>('{"expression": "4500 * 1.18 - 250"}');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [confirmationPrompt, setConfirmationPrompt] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [toolRes, agentRes, execRes] = await Promise.allSettled([
        api.getTools(),
        api.getSpecializedAgents(),
        api.getAgentExecutions()
      ]);

      if (toolRes.status === 'fulfilled') setTools(toolRes.value.tools || []);
      if (agentRes.status === 'fulfilled') setAgents(agentRes.value.agents || []);
      if (execRes.status === 'fulfilled') setAgentExecutions(execRes.value.executions || []);
    } catch (e) {
      console.warn('Failed to load tools or agents', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgent(agentId);
    if (AGENT_PRESETS[agentId]) {
      setTaskQuery(AGENT_PRESETS[agentId].query);
    }
    setCurrentPlan(null);
  };

  const handlePlanTask = async () => {
    if (!taskQuery.trim()) return;
    setPlanningLoading(true);
    setCurrentPlan(null);
    try {
      const res = await api.planAgentTask(selectedAgent, taskQuery);
      if (res.success && res.plan) {
        setCurrentPlan(res.plan);
      }
    } catch (e: any) {
      alert(`Planning failed: ${e.message || 'Unknown error'}`);
    } finally {
      setPlanningLoading(false);
    }
  };

  const handleExecuteStepOrPlan = async (approvedStep?: number) => {
    if (!currentPlan) return;
    setExecutionLoading(true);
    try {
      const res = await api.executeAgentPlan(currentPlan.planId, approvedStep);
      if (res.success && res.plan) {
        setCurrentPlan(res.plan);
        // Refresh execution history
        const updatedExecs = await api.getAgentExecutions();
        setAgentExecutions(updatedExecs.executions || []);
      }
    } catch (e: any) {
      alert(`Execution failed: ${e.message || 'Unknown error'}`);
    } finally {
      setExecutionLoading(false);
    }
  };

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    setExecutionResult(null);
    setConfirmationToken(null);
    setConfirmationPrompt(null);

    switch (toolName) {
      case 'calculator':
        setToolArgs('{\n  "expression": "4500 * 1.18 - 250"\n}');
        break;
      case 'weather_lookup':
        setToolArgs('{\n  "city": "Mumbai"\n}');
        break;
      case 'web_search':
        setToolArgs('{\n  "query": "Autonomous AI Personal Assistant Architecture 2026"\n}');
        break;
      case 'task_scheduler':
        setToolArgs('{\n  "title": "Review Q3 Forecasting Model",\n  "priority": "high"\n}');
        break;
      case 'code_runner':
        setToolArgs('{\n  "code": "const items = [10, 20, 30];\\nconsole.log(\'Sum:\', items.reduce((a, b) => a + b, 0));"\n}');
        break;
      case 'email_sender':
        setToolArgs('{\n  "recipient": "lead@prachi.ai",\n  "subject": "Platform Verification Complete",\n  "body": "All 15 build kit phases pass acceptance criteria."\n}');
        break;
      case 'currency_converter':
        setToolArgs('{\n  "amount": 2500,\n  "from": "USD",\n  "to": "INR"\n}');
        break;
      case 'stock_quote_lookup':
        setToolArgs('{\n  "symbol": "NVDA"\n}');
        break;
      default:
        setToolArgs('{}');
    }
  };

  const handleExecuteDirectTool = async () => {
    setLoading(true);
    setExecutionResult(null);
    setConfirmationToken(null);
    setConfirmationPrompt(null);

    try {
      const parsedArgs = JSON.parse(toolArgs);
      const res = await api.executeTool(selectedTool, parsedArgs);

      if (res.status === 'requires_confirmation') {
        setConfirmationToken(res.result.confirmationToken);
        setConfirmationPrompt(res.confirmationPrompt);
      } else {
        setExecutionResult(res);
      }
    } catch (e: any) {
      setExecutionResult({ status: 'error', error: e.message || 'Invalid JSON arguments or execution failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDirectToolAction = async () => {
    if (!confirmationToken) return;
    setLoading(true);
    try {
      const res = await api.confirmToolAction(confirmationToken);
      setExecutionResult(res);
      setConfirmationToken(null);
      setConfirmationPrompt(null);
    } catch (e: any) {
      setExecutionResult({ status: 'error', error: e.message || 'Confirmation execution failed' });
    } finally {
      setLoading(false);
    }
  };

  const currentToolMeta = tools.find(t => t.name === selectedTool);
  const awaitingApprovalStep = currentPlan?.steps.find(s => s.status === 'awaiting_approval');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
            <Cpu size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>AI Agents & Autonomous Automation</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              8 Specialized Autonomous Agents with multi-step task decomposition and human-in-the-loop approval gates.
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="tab-pill-toggle" style={{ display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('agents')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'agents' ? 'var(--accent-indigo)' : 'transparent',
              color: activeTab === 'agents' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Bot size={16} />
            <span>Specialized Agents (8)</span>
          </button>
          <button
            onClick={() => setActiveTab('direct_tools')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'direct_tools' ? 'var(--accent-indigo)' : 'transparent',
              color: activeTab === 'direct_tools' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Wrench size={16} />
            <span>Direct Tool Sandbox</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: SPECIALIZED AUTONOMOUS AGENTS ================= */}
      {activeTab === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Agent Selector Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: '12px' }}>
            {Object.entries(AGENT_PRESETS).map(([key, meta]) => {
              const IconComp = meta.icon;
              const isSelected = selectedAgent === key;
              return (
                <div
                  key={key}
                  onClick={() => handleSelectAgent(key)}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ padding: '6px', borderRadius: '8px', background: isSelected ? 'var(--accent-indigo)' : 'rgba(255, 255, 255, 0.05)', color: isSelected ? '#fff' : 'var(--accent-indigo)' }}>
                        <IconComp size={16} />
                      </div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {meta.label}
                      </span>
                    </div>
                    {isSelected && <span className="badge badge-indigo">Active</span>}
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                    {meta.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Task Formulation & Execution Area */}
          <div className="grid-2">
            {/* Input & Decompose */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} style={{ color: 'var(--accent-indigo)' }} />
                  <span>Task Query & Decomposition</span>
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Selected: <strong>{AGENT_PRESETS[selectedAgent]?.label}</strong>
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Natural Language Objective / Prompt
                </label>
                <textarea
                  rows={4}
                  className="input-control"
                  style={{ width: '100%', fontSize: '0.86rem', resize: 'vertical' }}
                  value={taskQuery}
                  onChange={(e) => setTaskQuery(e.target.value)}
                  placeholder="Describe your multi-step objective for this autonomous agent..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handlePlanTask}
                  disabled={planningLoading || !taskQuery.trim()}
                  style={{ flex: 1 }}
                >
                  <ListChecks size={16} />
                  <span>{planningLoading ? 'Decomposing Task...' : 'Decompose & Plan Workflow'}</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setTaskQuery(AGENT_PRESETS[selectedAgent]?.query || '')}
                  title="Reset to default preset"
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              {/* Recent Agent Executions */}
              {agentExecutions.length > 0 && (
                <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Recent Executions
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {agentExecutions.slice(0, 5).map((ex: any) => (
                      <div
                        key={ex.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: 'var(--bg-surface)',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ex.agent_type}:</span> {ex.task_query}
                        </div>
                        <span className={`badge ${ex.status === 'completed' ? 'badge-emerald' : ex.status === 'failed' ? 'badge-rose' : 'badge-amber'}`}>
                          {ex.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Workflow Step Tracker & Plan Output */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Autonomous Execution Radar</span>
                </h3>
                {currentPlan && (
                  <span className={`badge ${currentPlan.status === 'completed' ? 'badge-emerald' : currentPlan.status === 'paused_for_approval' ? 'badge-rose' : 'badge-indigo'}`}>
                    Status: {currentPlan.status.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Human Approval Alert Gate */}
              {awaitingApprovalStep && (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid var(--accent-rose)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} style={{ color: 'var(--accent-rose)' }} />
                    <strong style={{ fontSize: '0.88rem', color: 'var(--accent-rose)' }}>
                      Human Approval Gate Required (Step {awaitingApprovalStep.step})
                    </strong>
                  </div>
                  <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-primary)' }}>
                    {awaitingApprovalStep.title} — {awaitingApprovalStep.description}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleExecuteStepOrPlan(awaitingApprovalStep.step)}
                      disabled={executionLoading}
                      style={{ background: 'var(--accent-rose)', padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      <UserCheck size={15} />
                      <span>Approve & Execute Step {awaitingApprovalStep.step}</span>
                    </button>
                  </div>
                </div>
              )}

              {!currentPlan && !planningLoading && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '50px 20px', fontSize: '0.88rem' }}>
                  Formulate a task on the left and click <strong>Decompose & Plan Workflow</strong> to inspect the multi-step execution DAG.
                </div>
              )}

              {planningLoading && (
                <div style={{ color: 'var(--accent-indigo)', textAlign: 'center', padding: '50px 20px' }}>
                  Decomposing objective into sequential sub-tasks and policy gates...
                </div>
              )}

              {currentPlan && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Step List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                    {currentPlan.steps.map((st) => {
                      const isAwaiting = st.status === 'awaiting_approval';
                      const isDone = st.status === 'completed';
                      return (
                        <div
                          key={st.step}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: isAwaiting ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-surface)',
                            border: isAwaiting ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: isDone ? 'rgba(16, 185, 129, 0.2)' : isAwaiting ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                              color: isDone ? 'var(--accent-emerald)' : isAwaiting ? 'var(--accent-rose)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.78rem',
                              fontWeight: 700
                            }}>
                              {isDone ? '✓' : st.step}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {st.title}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {st.description} {st.toolRequired && `• Tool: ${st.toolRequired}`}
                              </div>
                            </div>
                          </div>

                          <span className={`badge ${isDone ? 'badge-emerald' : isAwaiting ? 'badge-rose' : 'badge-secondary'}`}>
                            {st.status.replace('_', ' ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions & Result */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Tokens: <strong>{currentPlan.totalTokensUsed || 0}</strong>
                    </div>

                    {currentPlan.status !== 'completed' && !awaitingApprovalStep && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleExecuteStepOrPlan()}
                        disabled={executionLoading}
                      >
                        <Play size={15} />
                        <span>{executionLoading ? 'Executing Workflow...' : 'Execute Remaining Steps'}</span>
                      </button>
                    )}
                  </div>

                  {currentPlan.finalResult && (
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                        Synthesis & Deliverable:
                      </div>
                      {currentPlan.finalResult}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: DIRECT TOOL WORKBENCH ================= */}
      {activeTab === 'direct_tools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Confirmation Gate Banner */}
          {confirmationToken && (
            <div style={{
              padding: '18px 24px',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid var(--accent-rose)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={22} style={{ color: 'var(--accent-rose)' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                  Explicit Authorization Gate Triggered
                </h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                {confirmationPrompt}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" onClick={handleConfirmDirectToolAction} disabled={loading} style={{ background: 'var(--accent-rose)' }}>
                  Confirm & Execute Action
                </button>
                <button className="btn btn-secondary" onClick={() => { setConfirmationToken(null); setConfirmationPrompt(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid-2">
            {/* Tool Selector & Config */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px' }}>
                Select Tool & Arguments
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '340px', overflowY: 'auto' }}>
                {tools.map((t) => {
                  const isSelected = selectedTool === t.name;
                  return (
                    <div
                      key={t.name}
                      onClick={() => handleToolSelect(t.name)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t.displayName}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {t.description}
                        </div>
                      </div>

                      <span className={`badge ${t.requiresConfirmation ? 'badge-rose' : 'badge-emerald'}`}>
                        {t.requiresConfirmation ? 'Approval Required' : 'Autonomous'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Execution Parameters (JSON)
                </label>
                <textarea
                  rows={5}
                  className="input-control"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                  value={toolArgs}
                  onChange={(e) => setToolArgs(e.target.value)}
                />
              </div>

              <button className="btn btn-primary" onClick={handleExecuteDirectTool} disabled={loading} style={{ marginTop: '14px', width: '100%' }}>
                <Play size={16} />
                <span>{loading ? 'Executing...' : `Execute ${currentToolMeta?.displayName || 'Tool'}`}</span>
              </button>
            </div>

            {/* Execution Output Panel */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span>Execution Sandbox Output</span>
              </h3>

              <div style={{
                flex: 1,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                overflowY: 'auto',
                maxHeight: '440px',
                color: 'var(--text-primary)'
              }}>
                {!executionResult && !loading && (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 20px' }}>
                    Tool output and audit telemetry will appear here after execution.
                  </div>
                )}

                {loading && (
                  <div style={{ color: 'var(--accent-indigo)' }}>
                    Running tool verification and parameter policy check...
                  </div>
                )}

                {executionResult && (
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(executionResult, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

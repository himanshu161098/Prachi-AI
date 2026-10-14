import {
  User,
  Conversation,
  Message,
  Memory,
  DocumentItem,
  Citation,
  VisionResult,
  ForecastResult,
  TaskItem,
  Artifact,
  RegisteredTool,
  AuditLog
} from '../types';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      if (window.location.port === '3001' || window.location.port === '3000') {
        return '/api';
      }
      // Running on Live Server (Port 5500) or other dev server -> connect to Node backend on 3001
      const host = window.location.hostname || '127.0.0.1';
      return `http://${host}:3001/api`;
    }
    // Live Cloud Backend on Render
    return 'https://prachi-ai-backend.onrender.com/api';
  }
  return 'http://localhost:3001/api';
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('prachi_auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let res: Response;
    try {
      res = await fetch(`${getApiBase()}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (netErr: any) {
      throw new Error(`Unable to reach Prachi AI backend at ${getApiBase()}. Make sure backend server is running on port 3001.`);
    }

    const text = await res.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }

    if (!res.ok) {
      throw new Error(data.message || data.error || `HTTP ${res.status}: Request failed`);
    }

    return data as T;
  }

  // Auth
  async sendOtp(identifier: string, purpose: 'register' | 'login' = 'login'): Promise<{
    success: boolean;
    message: string;
    identifier: string;
    channel: 'email' | 'sms';
    purpose: 'register' | 'login';
    devOtp?: string;
    expiresInSeconds: number;
  }> {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, purpose }),
    });
  }

  async verifyOtp(
    identifier: string,
    otp: string,
    purpose: 'register' | 'login' = 'login'
  ): Promise<{
    success: boolean;
    message?: string;
    token?: string;
    user?: User;
    verificationToken?: string;
  }> {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp, purpose }),
    });
  }

  async login(
    identifierOrEmail: string | { identifier: string; password?: string; otp?: string; captchaToken: string },
    legacyPassword?: string
  ): Promise<{ token: string; user: User }> {
    let body: any;
    if (typeof identifierOrEmail === 'object') {
      body = identifierOrEmail;
    } else {
      body = {
        identifier: identifierOrEmail,
        password: legacyPassword,
        captchaToken: 'robot-verified-legacy-session'
      };
    }
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async register(
    paramsOrEmail: string | { identifier: string; password: string; fullName: string; otp: string; captchaToken: string },
    legacyPassword?: string,
    legacyFullName?: string
  ): Promise<{ token: string; user: User }> {
    let body: any;
    if (typeof paramsOrEmail === 'object') {
      body = paramsOrEmail;
    } else {
      body = {
        identifier: paramsOrEmail,
        password: legacyPassword,
        fullName: legacyFullName,
        otp: '000000',
        captchaToken: 'robot-verified-legacy-session'
      };
    }
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getMe(): Promise<User> {
    return this.request('/auth/me');
  }

  async updatePreferences(preferences: Record<string, any>): Promise<any> {
    return this.request('/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  }

  // Chat
  async getProviders(): Promise<{ providers: Array<{ id: string; name: string; available: boolean }> }> {
    return this.request('/chat/providers');
  }

  async getConversations(): Promise<{ conversations: Conversation[] }> {
    return this.request('/chat/conversations');
  }

  async getMessages(conversationId: string): Promise<{ messages: Message[] }> {
    return this.request(`/chat/conversations/${conversationId}/messages`);
  }

  async sendMessage(params: {
    message: string;
    conversationId?: string;
    provider?: string;
    mode?: string;
    model?: string;
    enableMemory?: boolean;
    enableRAG?: boolean;
    attachment?: any;
  }): Promise<{
    conversationId: string;
    messageId: string;
    response: string;
    toolCalls?: any[];
    toolResults?: any[];
    citations?: Citation[];
    artifact?: any;
    clientAction?: any;
    attachment?: any;
    modelUsed: string;
  }> {
    return this.request('/chat/message', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async deleteConversation(id: string): Promise<any> {
    return this.request(`/chat/conversations/${id}`, { method: 'DELETE' });
  }

  async deleteAllConversations(): Promise<any> {
    return this.request('/chat/conversations', { method: 'DELETE' });
  }

  async clearConversationMessages(id: string): Promise<any> {
    return this.request(`/chat/conversations/${id}/messages`, { method: 'DELETE' });
  }

  async deleteMessage(messageId: string): Promise<any> {
    return this.request(`/chat/messages/${messageId}`, { method: 'DELETE' });
  }

  // Memory
  async getMemories(): Promise<{ memories: Memory[] }> {
    return this.request('/memory');
  }

  async addMemory(memory: { category: string; content: string; tags?: string[]; confidence?: number }): Promise<{ memory: Memory }> {
    return this.request('/memory', {
      method: 'POST',
      body: JSON.stringify(memory),
    });
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<{ memory: Memory }> {
    return this.request(`/memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteMemory(id: string): Promise<any> {
    return this.request(`/memory/${id}`, { method: 'DELETE' });
  }

  // RAG / Documents
  async getDocuments(): Promise<{ documents: DocumentItem[] }> {
    return this.request('/rag/documents');
  }

  async ingestText(filename: string, content: string): Promise<any> {
    return this.request('/rag/ingest-text', {
      method: 'POST',
      body: JSON.stringify({ filename, content }),
    });
  }

  async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/rag/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async queryKnowledge(query: string, topK = 3): Promise<{ query: string; citations: Citation[] }> {
    return this.request('/rag/query', {
      method: 'POST',
      body: JSON.stringify({ query, topK }),
    });
  }

  async deleteDocument(id: string): Promise<any> {
    return this.request(`/rag/documents/${id}`, { method: 'DELETE' });
  }

  // Vision
  async analyzeVision(params: { preset?: string; prompt?: string; file?: File }): Promise<VisionResult> {
    if (params.file) {
      const formData = new FormData();
      formData.append('image', params.file);
      if (params.prompt) formData.append('prompt', params.prompt);
      return this.request('/vision/analyze', {
        method: 'POST',
        body: formData,
      });
    }

    return this.request('/vision/analyze', {
      method: 'POST',
      body: JSON.stringify({ preset: params.preset, prompt: params.prompt }),
    });
  }

  // Forecasting
  async getForecastPresets(): Promise<{ presets: Array<{ id: string; name: string; frequency: string; description: string }> }> {
    return this.request('/forecast/presets');
  }

  async runForecast(params: {
    metricName?: string;
    presetDataset?: string;
    horizonSteps?: number;
    modelType?: string;
    smoothingFactor?: number;
    historicalData?: Array<{ date: string; value: number }>;
  }): Promise<ForecastResult> {
    return this.request('/forecast/predict', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Tools
  async getTools(): Promise<{ tools: RegisteredTool[] }> {
    return this.request('/tools/registry');
  }

  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    return this.request('/tools/execute', {
      method: 'POST',
      body: JSON.stringify({ toolName, arguments: args }),
    });
  }

  async confirmToolAction(token: string): Promise<any> {
    return this.request('/tools/confirm', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Tasks
  async getTasks(): Promise<{ tasks: TaskItem[] }> {
    return this.request('/tasks');
  }

  async createTask(task: { title: string; description?: string; priority?: string; due_date?: string }): Promise<{ task: TaskItem }> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTaskStatus(id: string, status: string): Promise<{ task: TaskItem }> {
    return this.request(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteTask(id: string): Promise<any> {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  // Artifacts
  async getArtifacts(): Promise<{ artifacts: Artifact[] }> {
    return this.request('/artifacts');
  }

  async createArtifact(artifact: { title: string; type: string; content: string; tags?: string[] }): Promise<{ artifact: Artifact }> {
    return this.request('/artifacts', {
      method: 'POST',
      body: JSON.stringify(artifact),
    });
  }

  async updateArtifact(id: string, updates: Partial<Artifact> & { bumpVersion?: boolean }): Promise<{ artifact: Artifact }> {
    return this.request(`/artifacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteArtifact(id: string): Promise<any> {
    return this.request(`/artifacts/${id}`, { method: 'DELETE' });
  }

  async generateImageArtifact(prompt: string, style = 'cyberpunk_vector'): Promise<{ artifact: Artifact; metadata: any }> {
    return this.request('/artifacts/images/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, style })
    });
  }

  async editImageArtifact(id: string, filter?: string, overlayText?: string): Promise<{ artifact: Artifact }> {
    return this.request(`/artifacts/images/${id}/edit`, {
      method: 'POST',
      body: JSON.stringify({ filter, overlayText })
    });
  }

  getArtifactDownloadUrl(id: string): string {
    return `/api/artifacts/${id}/download`;
  }

  // Admin
  async getAdminMetrics(): Promise<any> {
    return this.request('/admin/metrics');
  }

  async getAuditLogs(limit = 50, offset = 0): Promise<{ logs: AuditLog[] }> {
    return this.request(`/admin/audit-logs?limit=${limit}&offset=${offset}`);
  }

  async toggleFeatureFlag(key: string, is_enabled: boolean): Promise<any> {
    return this.request(`/admin/feature-flags/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_enabled }),
    });
  }

  async getHealth(): Promise<any> {
    return this.request('/admin/health');
  }
}

export const api = new ApiClient();

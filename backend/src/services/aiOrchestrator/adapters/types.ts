export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: any;
    }>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface Citation {
  sourceTitle: string;
  chunkText: string;
  relevanceScore?: number;
  uri?: string;
}

export interface ArtifactOutput {
  title: string;
  type: 'markdown' | 'code' | 'json' | 'table' | 'forecast_report' | 'svg';
  content: string;
}

export interface ClientAction {
  type: 'open_url' | 'open_app' | 'call_contact' | 'send_message';
  target: string;
  appName?: string;
  action?: 'play' | 'search' | 'open';
  query?: string;
  displayTitle?: string;
  videoId?: string;
  embedUrl?: string;
  contactName?: string;
  phone?: string;
  platform?: 'whatsapp' | 'sms';
  messageText?: string;
}

export interface ChatAttachment {
  name?: string;
  type?: string;
  size?: number;
  data?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  dataUrl?: string;
  content?: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  userMemories?: string[];
  ragContext?: Citation[];
  userId?: string;
  userName?: string;
  attachment?: ChatAttachment;
}

export interface ChatResult {
  text: string;
  toolCalls?: ToolCall[];
  citations?: Citation[];
  artifact?: ArtifactOutput;
  clientAction?: ClientAction;
  attachment?: ChatAttachment;
  modelUsed: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface AIProviderAdapter {
  id: string;
  name: string;
  isAvailable(): boolean;
  generateResponse(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult>;
}

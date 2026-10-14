export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  preferences?: Record<string, any>;
}

export type MemoryCategory = 'fact' | 'preference' | 'project' | 'working';

export interface Memory {
  id: string;
  user_id: string;
  category: MemoryCategory;
  content: string;
  confidence: number;
  tags_json: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  mode: string;
  last_message?: string;
  message_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls_json?: string;
  citations_json?: string;
  token_count: number;
  created_at: string;
  artifact?: any;
  clientAction?: {
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
  };
  attachment?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl?: string;
    content?: string;
  };
}

export interface Citation {
  sourceTitle: string;
  chunkText: string;
  relevanceScore?: number;
  uri?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: string;
  chunk_count?: number;
  created_at: string;
}

export interface BoundingBox {
  id: string;
  label: string;
  confidence: number;
  box: [number, number, number, number]; // ymin, xmin, ymax, xmax
  color: string;
}

export interface VisionResult {
  imageId: string;
  filename: string;
  summary: string;
  detectedObjects: BoundingBox[];
  extractedText: string;
  tags: string[];
  dimensions: { width: number; height: number };
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface ForecastPoint {
  date: string;
  forecast: number;
  lowerBound: number;
  upperBound: number;
  uncertaintyScore: number;
}

export interface ForecastResult {
  modelId: string;
  modelName: string;
  modelType: string;
  version: string;
  targetMetric: string;
  history: TimeSeriesPoint[];
  forecast: ForecastPoint[];
  metrics: {
    mse: number;
    rmse: number;
    mae: number;
    r2: number;
    standardError: number;
  };
  disclaimer: string;
  provenance: {
    datasetSize: number;
    generatedAt: string;
    algorithm: string;
  };
}

export interface TaskItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: string;
  created_at: string;
}

export interface Artifact {
  id: string;
  user_id: string;
  title: string;
  type: 'markdown' | 'code' | 'json' | 'table' | 'forecast_report' | 'image/svg+xml';
  content: string;
  version: number;
  tags_json: string;
  is_favorite: number;
  created_at: string;
  updated_at: string;
}

export interface RegisteredTool {
  name: string;
  displayName: string;
  description: string;
  category: string;
  requiresConfirmation: boolean;
  parameters: Record<string, any>;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource: string;
  details_json?: string;
  ip_address?: string;
  status: 'success' | 'failure' | 'warning';
  created_at: string;
}

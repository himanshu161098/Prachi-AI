export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  phone?: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  preferences_json?: string;
  created_at: string;
  updated_at: string;
}

export type MemoryCategory = 'fact' | 'preference' | 'project' | 'working';

export interface Memory {
  id: string;
  user_id: string;
  category: MemoryCategory;
  content: string;
  confidence: number;
  tags_json: string;
  is_active: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  mode: string;
  system_prompt?: string;
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
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: 'pending' | 'indexed' | 'failed';
  extracted_text?: string;
  metadata_json?: string;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  text: string;
  embedding_json?: string;
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

export interface ForecastModel {
  id: string;
  user_id: string;
  model_name: string;
  model_type: 'linear_trend' | 'exponential_smoothing' | 'moving_average' | 'autoregressive';
  version: string;
  parameters_json: string;
  metrics_json: string;
  created_at: string;
}

export interface ForecastPrediction {
  id: string;
  user_id: string;
  model_id: string;
  target_metric: string;
  history_json: string;
  forecast_json: string;
  uncertainty_json: string;
  created_at: string;
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

export interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  is_enabled: number;
  updated_at: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: UserRole;
}

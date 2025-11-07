// Core Types
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  imageUrl?: string | null;
  citations?: Citation[];
  timestamp: Date;
  metadata?: Record<string, any>;
  reasoning?: string;
  confidence?: number;
}

export interface Citation {
  id: string;
  title: string;
  url: string;
  page?: number;
  section?: string;
  relevanceScore: number;
  excerpt: string;
  documentId: string;
}

export type SourceType = 'pdf' | 'url' | 'docx' | 'txt' | 'md' | 'html' | 'rtf';

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  url?: string;
  filePath?: string;
  collaborators?: Collaborator[];
  isMonitored?: boolean;
  uploadDate: Date;
  lastModified: Date;
  size: number;
  status: 'processing' | 'ready' | 'error' | 'archived';
  metadata: DocumentMetadata;
  permissions: DocumentPermissions;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'viewer' | 'editor' | 'admin';
  permissions: string[];
}

export interface DocumentMetadata {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  language: string;
  pageCount?: number;
  wordCount?: number;
  createdAt: Date;
  modifiedAt: Date;
  ocrText?: string;
  extractedText: string;
  summary?: string;
  entities?: Entity[];
  topics?: Topic[];
}

export interface DocumentPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canDownload: boolean;
  restrictedTo: string[];
}

// AI and ML Types
export interface Entity {
  id: string;
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'concept' | 'product';
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export interface Topic {
  id: string;
  name: string;
  confidence: number;
  keywords: string[];
  relatedTopics: string[];
}

export interface SearchResult {
  id: string;
  documentId: string;
  title: string;
  content: string;
  relevanceScore: number;
  highlights: Highlight[];
  metadata: Record<string, any>;
  citations: Citation[];
}

export interface Highlight {
  text: string;
  startIndex: number;
  endIndex: number;
  type: 'exact' | 'semantic' | 'keyword';
}

export interface QueryResult {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  reasoning: string;
  followUpQuestions: string[];
  relatedQueries: string[];
  executionTime: number;
}

// Multi-Agent System Types
export interface Agent {
  id: string;
  name: string;
  type: 'researcher' | 'analyzer' | 'summarizer' | 'comparator' | 'validator';
  description: string;
  capabilities: string[];
  isActive: boolean;
  config: AgentConfig;
}

export interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: string[];
}

export interface AgentTask {
  id: string;
  agentId: string;
  type: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Knowledge Graph Types
export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'concept' | 'entity' | 'document' | 'topic';
  properties: Record<string, any>;
  position: { x: number; y: number; z: number };
  size: number;
  color: string;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: 'related' | 'contains' | 'mentions' | 'similar';
  weight: number;
  properties: Record<string, any>;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    lastUpdated: Date;
  };
}

// Web Monitoring Types
export interface WebMonitor {
  id: string;
  name: string;
  url: string;
  type: 'page' | 'rss' | 'api';
  frequency: 'hourly' | 'daily' | 'weekly';
  isActive: boolean;
  lastChecked?: Date;
  lastChange?: Date;
  changeThreshold: number;
  keywords: string[];
  notifications: NotificationConfig;
}

export interface NotificationConfig {
  email: boolean;
  webhook: boolean;
  webhookUrl?: string;
  channels: string[];
}

// Analytics and Reporting Types
export interface Analytics {
  totalDocuments: number;
  totalQueries: number;
  averageResponseTime: number;
  topDocuments: DocumentStats[];
  topQueries: QueryStats[];
  userActivity: UserActivity[];
  systemHealth: SystemHealth;
}

export interface DocumentStats {
  documentId: string;
  title: string;
  views: number;
  queries: number;
  lastAccessed: Date;
  rating: number;
}

export interface QueryStats {
  query: string;
  frequency: number;
  averageRating: number;
  lastUsed: Date;
  successRate: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  action: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  lastUpdated: Date;
}

// Team Collaboration Types
export interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  projects: Project[];
  createdAt: Date;
  settings: TeamSettings;
}

export interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
  permissions: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  documents: string[];
  members: string[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived' | 'deleted';
}

export interface TeamSettings {
  allowGuestAccess: boolean;
  requireApproval: boolean;
  defaultPermissions: string[];
  notificationSettings: Record<string, boolean>;
}

// Voice and UI Types
export interface VoiceCommand {
  command: string;
  action: string;
  parameters: Record<string, any>;
  confidence: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Configuration Types
export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  features: {
    voiceInput: boolean;
    webMonitoring: boolean;
    teamCollaboration: boolean;
    analytics: boolean;
    knowledgeGraph: boolean;
  };
  limits: {
    maxFileSize: number;
    maxDocuments: number;
    maxTeamMembers: number;
  };
  ai: {
    defaultModel: string;
    fallbackModel: string;
    maxTokens: number;
    temperature: number;
  };
}

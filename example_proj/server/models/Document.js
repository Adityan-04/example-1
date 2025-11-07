import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true,
    unique: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['pdf', 'docx', 'txt', 'md', 'html', 'rtf']
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'error', 'archived'],
    default: 'processing'
  },
  processingStatus: {
    textExtraction: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    ocrProcessing: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
    embeddingGeneration: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    entityExtraction: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    topicModeling: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' }
  },
  metadata: {
    author: String,
    subject: String,
    keywords: [String],
    language: { type: String, default: 'en' },
    pageCount: Number,
    wordCount: Number,
    createdAt: Date,
    modifiedAt: Date,
    version: { type: String, default: '1.0' }
  },
  extractedText: {
    type: String,
    default: ''
  },
  ocrText: {
    type: String,
    default: ''
  },
  summary: {
    type: String,
    default: ''
  },
  entities: [{
    text: String,
    type: { type: String, enum: ['person', 'organization', 'location', 'date', 'concept', 'product'] },
    confidence: Number,
    startIndex: Number,
    endIndex: Number,
    metadata: mongoose.Schema.Types.Mixed
  }],
  topics: [{
    name: String,
    confidence: Number,
    keywords: [String],
    relatedTopics: [String]
  }],
  embeddings: [{
    chunkId: String,
    text: String,
    vector: [Number],
    metadata: mongoose.Schema.Types.Mixed
  }],
  permissions: {
    canView: { type: Boolean, default: true },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canShare: { type: Boolean, default: false },
    canDownload: { type: Boolean, default: true },
    restrictedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  collaborators: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['viewer', 'editor', 'admin'] },
    permissions: [String],
    addedAt: { type: Date, default: Date.now }
  }],
  tags: [String],
  isPublic: {
    type: Boolean,
    default: false
  },
  isMonitored: {
    type: Boolean,
    default: false
  },
  version: {
    type: Number,
    default: 1
  },
  parentDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  childDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  analytics: {
    views: { type: Number, default: 0 },
    queries: { type: Number, default: 0 },
    lastAccessed: Date,
    rating: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 }
  },
  errorLog: [{
    step: String,
    error: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ team: 1, createdAt: -1 });
documentSchema.index({ status: 1 });
documentSchema.index({ fileType: 1 });
documentSchema.index({ 'metadata.language': 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ isPublic: 1 });
documentSchema.index({ 'analytics.lastAccessed': -1 });

// Text search index
documentSchema.index({
  title: 'text',
  'metadata.keywords': 'text',
  'extractedText': 'text',
  'ocrText': 'text',
  'summary': 'text'
});

// Virtual for full text content
documentSchema.virtual('fullText').get(function() {
  return `${this.extractedText} ${this.ocrText}`.trim();
});

// Method to check if user can access document
documentSchema.methods.canAccess = function(userId, userRole = 'user') {
  // Owner can always access
  if (this.owner.toString() === userId.toString()) return true;
  
  // Super admin can access everything
  if (userRole === 'super_admin') return true;
  
  // Check if user is in restricted list
  if (this.permissions.restrictedTo.length > 0) {
    return this.permissions.restrictedTo.some(id => id.toString() === userId.toString());
  }
  
  // Check collaborators
  const collaborator = this.collaborators.find(c => c.user.toString() === userId.toString());
  if (collaborator) return true;
  
  // Public documents
  if (this.isPublic) return this.permissions.canView;
  
  return false;
};

// Method to get user permissions
documentSchema.methods.getUserPermissions = function(userId) {
  if (this.owner.toString() === userId.toString()) {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
      canDownload: true
    };
  }
  
  const collaborator = this.collaborators.find(c => c.user.toString() === userId.toString());
  if (collaborator) {
    return {
      canView: true,
      canEdit: collaborator.role === 'editor' || collaborator.role === 'admin',
      canDelete: collaborator.role === 'admin',
      canShare: collaborator.role === 'admin',
      canDownload: true
    };
  }
  
  return this.permissions;
};

// Method to update analytics
documentSchema.methods.updateAnalytics = function(action) {
  switch (action) {
    case 'view':
      this.analytics.views += 1;
      this.analytics.lastAccessed = new Date();
      break;
    case 'query':
      this.analytics.queries += 1;
      this.analytics.lastAccessed = new Date();
      break;
    case 'download':
      this.analytics.downloadCount += 1;
      break;
  }
  return this.save();
};

export default mongoose.model('Document', documentSchema);

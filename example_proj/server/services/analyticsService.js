import Document from '../models/Document.js';
import User from '../models/User.js';

class AnalyticsService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('📊 Initializing analytics service...');
      this.initialized = true;
      console.log('✅ Analytics service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize analytics service:', error);
      throw error;
    }
  }

  async getSystemAnalytics() {
    try {
      const [
        totalDocuments,
        totalUsers,
        documentsByType,
        documentsByStatus,
        recentUploads,
        userActivity
      ] = await Promise.all([
        Document.countDocuments(),
        User.countDocuments(),
        this.getDocumentsByType(),
        this.getDocumentsByStatus(),
        this.getRecentUploads(),
        this.getUserActivity()
      ]);

      return {
        overview: {
          totalDocuments,
          totalUsers,
          totalQueries: 0, // Would be tracked in a real implementation
          averageResponseTime: 0 // Would be tracked in a real implementation
        },
        documents: {
          byType: documentsByType,
          byStatus: documentsByStatus,
          recentUploads
        },
        users: {
          activity: userActivity
        },
        system: {
          status: 'healthy',
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('Error getting system analytics:', error);
      throw error;
    }
  }

  async getUserAnalytics(userId) {
    try {
      const [
        userDocuments,
        documentStats,
        queryStats,
        recentActivity
      ] = await Promise.all([
        Document.find({ owner: userId }).select('title createdAt updatedAt analytics'),
        this.getUserDocumentStats(userId),
        this.getUserQueryStats(userId),
        this.getUserRecentActivity(userId)
      ]);

      return {
        documents: {
          total: userDocuments.length,
          stats: documentStats,
          recent: userDocuments
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
        },
        queries: {
          stats: queryStats
        },
        activity: recentActivity,
        usage: {
          storageUsed: userDocuments.reduce((sum, doc) => sum + (doc.size || 0), 0),
          documentsUploaded: userDocuments.length,
          lastActive: new Date()
        }
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  }

  async getDocumentAnalytics(documentId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      return {
        document: {
          id: document._id,
          title: document.title,
          type: document.fileType,
          size: document.size,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt
        },
        analytics: document.analytics || {
          views: 0,
          queries: 0,
          lastAccessed: null,
          rating: 0,
          downloadCount: 0
        },
        processing: {
          status: document.status,
          processingStatus: document.processingStatus
        },
        content: {
          wordCount: document.metadata?.wordCount || 0,
          pageCount: document.metadata?.pageCount || 0,
          entitiesCount: document.entities?.length || 0,
          topicsCount: document.topics?.length || 0
        }
      };
    } catch (error) {
      console.error('Error getting document analytics:', error);
      throw error;
    }
  }

  async getDocumentsByType() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$fileType',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const result = await Document.aggregate(pipeline);
      return result.map(item => ({
        type: item._id,
        count: item.count
      }));
    } catch (error) {
      console.error('Error getting documents by type:', error);
      return [];
    }
  }

  async getDocumentsByStatus() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const result = await Document.aggregate(pipeline);
      return result.map(item => ({
        status: item._id,
        count: item.count
      }));
    } catch (error) {
      console.error('Error getting documents by status:', error);
      return [];
    }
  }

  async getRecentUploads(limit = 10) {
    try {
      const documents = await Document.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('title fileType size createdAt owner')
        .populate('owner', 'name email');

      return documents.map(doc => ({
        id: doc._id,
        title: doc.title,
        type: doc.fileType,
        size: doc.size,
        uploadedAt: doc.createdAt,
        uploadedBy: doc.owner?.name || 'Unknown'
      }));
    } catch (error) {
      console.error('Error getting recent uploads:', error);
      return [];
    }
  }

  async getUserActivity(limit = 20) {
    try {
      // In a real implementation, you would track user activity in a separate collection
      // For now, we'll return mock data
      return [
        {
          userId: 'user1',
          userName: 'John Doe',
          action: 'Document uploaded',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          metadata: { documentTitle: 'Q3 Report.pdf' }
        },
        {
          userId: 'user2',
          userName: 'Jane Smith',
          action: 'Query executed',
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          metadata: { query: 'What are the key findings?' }
        }
      ].slice(0, limit);
    } catch (error) {
      console.error('Error getting user activity:', error);
      return [];
    }
  }

  async getUserDocumentStats(userId) {
    try {
      const pipeline = [
        { $match: { owner: userId } },
        {
          $group: {
            _id: null,
            totalDocuments: { $sum: 1 },
            totalSize: { $sum: '$size' },
            averageSize: { $avg: '$size' },
            totalViews: { $sum: '$analytics.views' },
            totalQueries: { $sum: '$analytics.queries' },
            totalDownloads: { $sum: '$analytics.downloadCount' }
          }
        }
      ];

      const result = await Document.aggregate(pipeline);
      return result[0] || {
        totalDocuments: 0,
        totalSize: 0,
        averageSize: 0,
        totalViews: 0,
        totalQueries: 0,
        totalDownloads: 0
      };
    } catch (error) {
      console.error('Error getting user document stats:', error);
      return {
        totalDocuments: 0,
        totalSize: 0,
        averageSize: 0,
        totalViews: 0,
        totalQueries: 0,
        totalDownloads: 0
      };
    }
  }

  async getUserQueryStats(userId) {
    try {
      // In a real implementation, you would track queries in a separate collection
      // For now, we'll return mock data
      return {
        totalQueries: 0,
        averageResponseTime: 0,
        topQueries: [],
        successRate: 0
      };
    } catch (error) {
      console.error('Error getting user query stats:', error);
      return {
        totalQueries: 0,
        averageResponseTime: 0,
        topQueries: [],
        successRate: 0
      };
    }
  }

  async getUserRecentActivity(userId, limit = 10) {
    try {
      // In a real implementation, you would track user activity in a separate collection
      // For now, we'll return mock data based on document activity
      const recentDocuments = await Document.find({ owner: userId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select('title updatedAt analytics');

      return recentDocuments.map(doc => ({
        action: 'Document updated',
        timestamp: doc.updatedAt,
        metadata: { documentTitle: doc.title }
      }));
    } catch (error) {
      console.error('Error getting user recent activity:', error);
      return [];
    }
  }

  async getTopDocuments(limit = 10) {
    try {
      const pipeline = [
        {
          $project: {
            title: 1,
            fileType: 1,
            'analytics.views': 1,
            'analytics.queries': 1,
            'analytics.rating': 1,
            'analytics.lastAccessed': 1,
            totalScore: {
              $add: [
                { $ifNull: ['$analytics.views', 0] },
                { $ifNull: ['$analytics.queries', 0] },
                { $multiply: [{ $ifNull: ['$analytics.rating', 0] }, 10] }
              ]
            }
          }
        },
        { $sort: { totalScore: -1 } },
        { $limit: limit }
      ];

      const result = await Document.aggregate(pipeline);
      return result.map(doc => ({
        id: doc._id,
        title: doc.title,
        type: doc.fileType,
        views: doc.analytics?.views || 0,
        queries: doc.analytics?.queries || 0,
        rating: doc.analytics?.rating || 0,
        lastAccessed: doc.analytics?.lastAccessed,
        totalScore: doc.totalScore
      }));
    } catch (error) {
      console.error('Error getting top documents:', error);
      return [];
    }
  }

  async getTopQueries(limit = 10) {
    try {
      // In a real implementation, you would track queries in a separate collection
      // For now, we'll return mock data
      return [
        {
          query: 'What are the main topics?',
          frequency: 15,
          averageRating: 4.2,
          lastUsed: new Date(Date.now() - 1000 * 60 * 30),
          successRate: 0.95
        },
        {
          query: 'Summarize the key points',
          frequency: 12,
          averageRating: 4.5,
          lastUsed: new Date(Date.now() - 1000 * 60 * 60),
          successRate: 0.92
        }
      ].slice(0, limit);
    } catch (error) {
      console.error('Error getting top queries:', error);
      return [];
    }
  }

  async getSystemHealth() {
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();

      return {
        status: 'healthy',
        uptime: uptime,
        memory: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
        },
        cpu: {
          usage: 0 // Would be calculated in a real implementation
        },
        disk: {
          usage: 0 // Would be calculated in a real implementation
        },
        activeConnections: 0, // Would be tracked in a real implementation
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        status: 'error',
        uptime: 0,
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0 },
        disk: { usage: 0 },
        activeConnections: 0,
        lastUpdated: new Date()
      };
    }
  }

  async generateReport(type, userId = null, options = {}) {
    try {
      let data;
      
      switch (type) {
        case 'user':
          data = await this.getUserAnalytics(userId);
          break;
        case 'system':
          data = await this.getSystemAnalytics();
          break;
        case 'document':
          data = await this.getDocumentAnalytics(options.documentId);
          break;
        default:
          throw new Error(`Unknown report type: ${type}`);
      }

      return {
        type,
        generatedAt: new Date(),
        data,
        metadata: {
          userId,
          options
        }
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
}

export { AnalyticsService };

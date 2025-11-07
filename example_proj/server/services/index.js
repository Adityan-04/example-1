import { DocumentService } from './documentService.js';
import { EmbeddingService } from './embeddingService.js';
import { SearchService } from './searchService.js';
import { AIService } from './aiService.js';
import { OCRService } from './ocrService.js';
import { AgentService } from './agentService.js';
import { KnowledgeGraphService } from './knowledgeGraphService.js';
import { WebMonitorService } from './webMonitorService.js';
import { AnalyticsService } from './analyticsService.js';
import { NotificationService } from './notificationService.js';

class ServiceManager {
  constructor() {
    this.services = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔧 Initializing services...');

      // Initialize core services
      this.services.document = new DocumentService();
      this.services.embedding = new EmbeddingService();
      this.services.search = new SearchService();
      this.services.ai = new AIService();
      this.services.ocr = new OCRService();
      this.services.agent = new AgentService();
      this.services.knowledgeGraph = new KnowledgeGraphService();
      this.services.webMonitor = new WebMonitorService();
      this.services.analytics = new AnalyticsService();
      this.services.notification = new NotificationService();

      // Initialize each service
      for (const [name, service] of Object.entries(this.services)) {
        if (service.initialize) {
          await service.initialize();
          console.log(`✅ ${name} service initialized`);
        }
      }

      this.initialized = true;
      console.log('🎉 All services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  getService(name) {
    if (!this.initialized) {
      throw new Error('Services not initialized. Call initialize() first.');
    }
    return this.services[name];
  }

  getAllServices() {
    return this.services;
  }
}

// Create singleton instance
const serviceManager = new ServiceManager();

export const initializeServices = () => serviceManager.initialize();
export const getService = (name) => serviceManager.getService(name);
export const getAllServices = () => serviceManager.getAllServices();

// Export individual services for direct access
export {
  DocumentService,
  EmbeddingService,
  SearchService,
  AIService,
  OCRService,
  AgentService,
  KnowledgeGraphService,
  WebMonitorService,
  AnalyticsService,
  NotificationService
};

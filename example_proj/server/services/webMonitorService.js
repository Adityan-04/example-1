import axios from 'axios';
import cron from 'node-cron';
import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import cheerio from 'cheerio';

class WebMonitorService {
  constructor() {
    this.monitors = new Map();
    this.cronJobs = new Map();
    this.parser = new Parser();
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🌐 Initializing web monitor service...');
      
      // Load existing monitors from database
      await this.loadMonitors();
      
      // Start monitoring cron jobs
      this.startMonitoring();
      
      this.initialized = true;
      console.log('✅ Web monitor service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize web monitor service:', error);
      throw error;
    }
  }

  async loadMonitors() {
    try {
      // In a real implementation, you would load from database
      // For now, we'll start with an empty set
      console.log('Loading web monitors...');
    } catch (error) {
      console.error('Error loading web monitors:', error);
    }
  }

  async createMonitor(monitorData) {
    try {
      const monitor = {
        id: this.generateMonitorId(),
        name: monitorData.name,
        url: monitorData.url,
        type: monitorData.type || 'page',
        frequency: monitorData.frequency || 'daily',
        isActive: monitorData.isActive !== false,
        lastChecked: null,
        lastChange: null,
        changeThreshold: monitorData.changeThreshold || 0.1,
        keywords: monitorData.keywords || [],
        notifications: {
          email: monitorData.notifications?.email || false,
          webhook: monitorData.notifications?.webhook || false,
          webhookUrl: monitorData.notifications?.webhookUrl || null,
          channels: monitorData.notifications?.channels || []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.monitors.set(monitor.id, monitor);

      // Schedule monitoring
      if (monitor.isActive) {
        this.scheduleMonitor(monitor);
      }

      return monitor;
    } catch (error) {
      console.error('Error creating web monitor:', error);
      throw error;
    }
  }

  async updateMonitor(monitorId, updates) {
    try {
      const monitor = this.monitors.get(monitorId);
      if (!monitor) {
        throw new Error('Monitor not found');
      }

      const updatedMonitor = {
        ...monitor,
        ...updates,
        updatedAt: new Date()
      };

      this.monitors.set(monitorId, updatedMonitor);

      // Reschedule if frequency changed
      if (updates.frequency && updates.frequency !== monitor.frequency) {
        this.unscheduleMonitor(monitorId);
        if (updatedMonitor.isActive) {
          this.scheduleMonitor(updatedMonitor);
        }
      }

      return updatedMonitor;
    } catch (error) {
      console.error('Error updating web monitor:', error);
      throw error;
    }
  }

  async deleteMonitor(monitorId) {
    try {
      const monitor = this.monitors.get(monitorId);
      if (!monitor) {
        throw new Error('Monitor not found');
      }

      // Stop monitoring
      this.unscheduleMonitor(monitorId);
      
      // Remove from monitors
      this.monitors.delete(monitorId);

      return true;
    } catch (error) {
      console.error('Error deleting web monitor:', error);
      throw error;
    }
  }

  async getMonitor(monitorId) {
    return this.monitors.get(monitorId);
  }

  async getAllMonitors() {
    return Array.from(this.monitors.values());
  }

  async getActiveMonitors() {
    return Array.from(this.monitors.values()).filter(monitor => monitor.isActive);
  }

  scheduleMonitor(monitor) {
    try {
      const cronExpression = this.getCronExpression(monitor.frequency);
      
      const job = cron.schedule(cronExpression, async () => {
        await this.checkMonitor(monitor.id);
      }, {
        scheduled: false
      });

      this.cronJobs.set(monitor.id, job);
      job.start();

      console.log(`Scheduled monitor ${monitor.name} with frequency ${monitor.frequency}`);
    } catch (error) {
      console.error('Error scheduling monitor:', error);
    }
  }

  unscheduleMonitor(monitorId) {
    try {
      const job = this.cronJobs.get(monitorId);
      if (job) {
        job.stop();
        this.cronJobs.delete(monitorId);
        console.log(`Unscheduled monitor ${monitorId}`);
      }
    } catch (error) {
      console.error('Error unscheduling monitor:', error);
    }
  }

  getCronExpression(frequency) {
    const expressions = {
      'hourly': '0 * * * *',
      'daily': '0 9 * * *',
      'weekly': '0 9 * * 1'
    };
    return expressions[frequency] || expressions['daily'];
  }

  async checkMonitor(monitorId) {
    try {
      const monitor = this.monitors.get(monitorId);
      if (!monitor || !monitor.isActive) {
        return;
      }

      console.log(`Checking monitor: ${monitor.name}`);

      let content;
      let changeDetected = false;

      switch (monitor.type) {
        case 'page':
          content = await this.checkWebPage(monitor);
          break;
        case 'rss':
          content = await this.checkRSSFeed(monitor);
          break;
        case 'api':
          content = await this.checkAPI(monitor);
          break;
        default:
          throw new Error(`Unknown monitor type: ${monitor.type}`);
      }

      // Check for changes
      if (monitor.lastChecked) {
        changeDetected = await this.detectChanges(monitor, content);
      }

      // Update monitor
      monitor.lastChecked = new Date();
      if (changeDetected) {
        monitor.lastChange = new Date();
        await this.handleChange(monitor, content);
      }

      this.monitors.set(monitorId, monitor);

    } catch (error) {
      console.error(`Error checking monitor ${monitorId}:`, error);
    }
  }

  async checkWebPage(monitor) {
    try {
      const response = await axios.get(monitor.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'DocuSage AI Web Monitor 1.0'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, header, footer').remove();
      
      // Extract main content
      const content = $('body').text().replace(/\s+/g, ' ').trim();
      
      return {
        url: monitor.url,
        content,
        status: response.status,
        timestamp: new Date(),
        size: content.length
      };
    } catch (error) {
      console.error('Error checking web page:', error);
      throw error;
    }
  }

  async checkRSSFeed(monitor) {
    try {
      const feed = await this.parser.parseURL(monitor.url);
      
      const content = {
        url: monitor.url,
        title: feed.title,
        description: feed.description,
        items: feed.items.map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          content: item.contentSnippet || item.content
        })),
        timestamp: new Date(),
        size: feed.items.length
      };

      return content;
    } catch (error) {
      console.error('Error checking RSS feed:', error);
      throw error;
    }
  }

  async checkAPI(monitor) {
    try {
      const response = await axios.get(monitor.url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      return {
        url: monitor.url,
        data: response.data,
        status: response.status,
        timestamp: new Date(),
        size: JSON.stringify(response.data).length
      };
    } catch (error) {
      console.error('Error checking API:', error);
      throw error;
    }
  }

  async detectChanges(monitor, newContent) {
    try {
      // Simple content comparison
      const oldContent = monitor.lastContent || '';
      const newContentStr = typeof newContent === 'string' ? newContent : JSON.stringify(newContent);
      
      // Calculate similarity
      const similarity = this.calculateSimilarity(oldContent, newContentStr);
      const changeRatio = 1 - similarity;
      
      // Store new content
      monitor.lastContent = newContentStr;
      
      return changeRatio > monitor.changeThreshold;
    } catch (error) {
      console.error('Error detecting changes:', error);
      return false;
    }
  }

  calculateSimilarity(str1, str2) {
    try {
      // Simple Jaccard similarity
      const set1 = new Set(str1.split(' '));
      const set2 = new Set(str2.split(' '));
      
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      
      return intersection.size / union.size;
    } catch (error) {
      console.error('Error calculating similarity:', error);
      return 0;
    }
  }

  async handleChange(monitor, content) {
    try {
      console.log(`Change detected for monitor: ${monitor.name}`);

      // Check if content matches keywords
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const matchingKeywords = monitor.keywords.filter(keyword => 
        contentStr.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchingKeywords.length > 0) {
        console.log(`Keywords matched: ${matchingKeywords.join(', ')}`);
      }

      // Send notifications
      await this.sendNotifications(monitor, content, matchingKeywords);

    } catch (error) {
      console.error('Error handling change:', error);
    }
  }

  async sendNotifications(monitor, content, matchingKeywords) {
    try {
      const notification = {
        monitorId: monitor.id,
        monitorName: monitor.name,
        url: monitor.url,
        timestamp: new Date(),
        changeDetected: true,
        matchingKeywords,
        content: typeof content === 'string' ? content.substring(0, 500) : 'Content changed'
      };

      // Email notification
      if (monitor.notifications.email) {
        await this.sendEmailNotification(notification);
      }

      // Webhook notification
      if (monitor.notifications.webhook && monitor.notifications.webhookUrl) {
        await this.sendWebhookNotification(monitor.notifications.webhookUrl, notification);
      }

      // Channel notifications
      for (const channel of monitor.notifications.channels) {
        await this.sendChannelNotification(channel, notification);
      }

    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  async sendEmailNotification(notification) {
    try {
      // In a real implementation, you would use an email service
      console.log('Email notification:', notification);
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  async sendWebhookNotification(webhookUrl, notification) {
    try {
      await axios.post(webhookUrl, notification, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Webhook notification sent');
    } catch (error) {
      console.error('Error sending webhook notification:', error);
    }
  }

  async sendChannelNotification(channel, notification) {
    try {
      // In a real implementation, you would send to specific channels
      console.log(`Channel notification to ${channel}:`, notification);
    } catch (error) {
      console.error('Error sending channel notification:', error);
    }
  }

  startMonitoring() {
    try {
      // Start all active monitors
      for (const monitor of this.monitors.values()) {
        if (monitor.isActive) {
          this.scheduleMonitor(monitor);
        }
      }
      console.log('Web monitoring started');
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  }

  stopMonitoring() {
    try {
      // Stop all cron jobs
      for (const [monitorId, job] of this.cronJobs) {
        job.stop();
      }
      this.cronJobs.clear();
      console.log('Web monitoring stopped');
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    }
  }

  generateMonitorId() {
    return 'monitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async getMonitorStats() {
    try {
      const activeMonitors = Array.from(this.monitors.values()).filter(m => m.isActive);
      const monitorsWithChanges = Array.from(this.monitors.values()).filter(m => m.lastChange);
      
      return {
        totalMonitors: this.monitors.size,
        activeMonitors: activeMonitors.length,
        monitorsWithChanges: monitorsWithChanges.length,
        lastCheck: Math.max(...Array.from(this.monitors.values()).map(m => m.lastChecked || 0)),
        cronJobsRunning: this.cronJobs.size
      };
    } catch (error) {
      console.error('Error getting monitor stats:', error);
      throw error;
    }
  }
}

export { WebMonitorService };

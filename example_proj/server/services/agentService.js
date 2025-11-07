import { getService } from './index.js';

class AgentService {
  constructor() {
    this.agents = new Map();
    this.tasks = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🤖 Initializing agent service...');
      
      // Initialize default agents
      await this.initializeDefaultAgents();
      
      this.initialized = true;
      console.log('✅ Agent service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize agent service:', error);
      throw error;
    }
  }

  async initializeDefaultAgents() {
    const defaultAgents = [
      {
        id: 'researcher',
        name: 'Research Agent',
        type: 'researcher',
        description: 'Searches and analyzes documents for specific information',
        capabilities: ['document_search', 'content_analysis', 'fact_extraction'],
        isActive: true,
        config: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.3,
          maxTokens: 1000,
          systemPrompt: 'You are a research agent specialized in finding and analyzing information from documents. Provide accurate, well-sourced answers.',
          tools: ['search', 'analyze', 'extract']
        }
      },
      {
        id: 'analyzer',
        name: 'Analysis Agent',
        type: 'analyzer',
        description: 'Performs deep analysis of document content and patterns',
        capabilities: ['content_analysis', 'pattern_recognition', 'insight_generation'],
        isActive: true,
        config: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.2,
          maxTokens: 1500,
          systemPrompt: 'You are an analysis agent that performs deep analysis of documents. Focus on patterns, insights, and meaningful connections.',
          tools: ['analyze', 'compare', 'synthesize']
        }
      },
      {
        id: 'summarizer',
        name: 'Summarization Agent',
        type: 'summarizer',
        description: 'Creates concise summaries of documents and content',
        capabilities: ['summarization', 'key_point_extraction', 'content_condensation'],
        isActive: true,
        config: {
          model: 'gpt-3.5-turbo',
          temperature: 0.1,
          maxTokens: 500,
          systemPrompt: 'You are a summarization agent. Create clear, concise summaries that capture the essential information.',
          tools: ['summarize', 'extract_key_points']
        }
      },
      {
        id: 'comparator',
        name: 'Comparison Agent',
        type: 'comparator',
        description: 'Compares documents and identifies similarities and differences',
        capabilities: ['document_comparison', 'similarity_analysis', 'difference_identification'],
        isActive: true,
        config: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.2,
          maxTokens: 1200,
          systemPrompt: 'You are a comparison agent. Analyze documents to identify similarities, differences, and relationships.',
          tools: ['compare', 'analyze_similarities', 'identify_differences']
        }
      },
      {
        id: 'validator',
        name: 'Validation Agent',
        type: 'validator',
        description: 'Validates information and checks for accuracy and consistency',
        capabilities: ['fact_checking', 'consistency_validation', 'accuracy_verification'],
        isActive: true,
        config: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.1,
          maxTokens: 800,
          systemPrompt: 'You are a validation agent. Verify information accuracy, check for consistency, and identify potential issues.',
          tools: ['validate', 'fact_check', 'verify_consistency']
        }
      }
    ];

    for (const agentData of defaultAgents) {
      this.agents.set(agentData.id, agentData);
    }
  }

  async createAgent(agentData) {
    try {
      const agent = {
        id: agentData.id || this.generateAgentId(),
        name: agentData.name,
        type: agentData.type,
        description: agentData.description,
        capabilities: agentData.capabilities || [],
        isActive: agentData.isActive !== false,
        config: {
          model: agentData.config?.model || 'gpt-4-turbo-preview',
          temperature: agentData.config?.temperature || 0.3,
          maxTokens: agentData.config?.maxTokens || 1000,
          systemPrompt: agentData.config?.systemPrompt || '',
          tools: agentData.config?.tools || []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.agents.set(agent.id, agent);
      return agent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  async updateAgent(agentId, updates) {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      const updatedAgent = {
        ...agent,
        ...updates,
        updatedAt: new Date()
      };

      this.agents.set(agentId, updatedAgent);
      return updatedAgent;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }

  async deleteAgent(agentId) {
    try {
      if (!this.agents.has(agentId)) {
        throw new Error('Agent not found');
      }

      this.agents.delete(agentId);
      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }

  async getAgent(agentId) {
    return this.agents.get(agentId);
  }

  async getAllAgents() {
    return Array.from(this.agents.values());
  }

  async getActiveAgents() {
    return Array.from(this.agents.values()).filter(agent => agent.isActive);
  }

  async executeTask(agentId, taskType, input) {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      if (!agent.isActive) {
        throw new Error('Agent is not active');
      }

      const taskId = this.generateTaskId();
      const task = {
        id: taskId,
        agentId,
        type: taskType,
        input,
        status: 'pending',
        createdAt: new Date()
      };

      this.tasks.set(taskId, task);

      // Execute task asynchronously
      this.executeTaskAsync(taskId).catch(error => {
        console.error(`Task ${taskId} execution error:`, error);
        this.updateTaskStatus(taskId, 'failed', { error: error.message });
      });

      return task;
    } catch (error) {
      console.error('Error executing task:', error);
      throw error;
    }
  }

  async executeTaskAsync(taskId) {
    try {
      const task = this.tasks.get(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const agent = this.agents.get(task.agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      this.updateTaskStatus(taskId, 'running');

      // Execute task based on agent type
      let result;
      switch (agent.type) {
        case 'researcher':
          result = await this.executeResearchTask(task, agent);
          break;
        case 'analyzer':
          result = await this.executeAnalysisTask(task, agent);
          break;
        case 'summarizer':
          result = await this.executeSummarizationTask(task, agent);
          break;
        case 'comparator':
          result = await this.executeComparisonTask(task, agent);
          break;
        case 'validator':
          result = await this.executeValidationTask(task, agent);
          break;
        default:
          throw new Error(`Unknown agent type: ${agent.type}`);
      }

      this.updateTaskStatus(taskId, 'completed', { output: result });
      return result;
    } catch (error) {
      console.error(`Task ${taskId} execution error:`, error);
      this.updateTaskStatus(taskId, 'failed', { error: error.message });
      throw error;
    }
  }

  async executeResearchTask(task, agent) {
    try {
      const { query, documents } = task.input;
      const searchService = getService('search');
      const aiService = getService('ai');

      // Search for relevant information
      const searchResults = await searchService.search(query, {
        limit: 10,
        threshold: 0.6
      });

      // Analyze results
      const context = searchResults.map(result => result.content).join('\n\n');
      const analysis = await aiService.generateAnswer(query, context, {
        temperature: agent.config.temperature,
        maxTokens: agent.config.maxTokens
      });

      return {
        query,
        results: searchResults,
        analysis: analysis.answer,
        confidence: analysis.confidence,
        sources: searchResults.length
      };
    } catch (error) {
      console.error('Research task error:', error);
      throw error;
    }
  }

  async executeAnalysisTask(task, agent) {
    try {
      const { content, analysisType } = task.input;
      const aiService = getService('ai');

      let analysis;
      switch (analysisType) {
        case 'sentiment':
          analysis = await aiService.analyzeSentiment(content);
          break;
        case 'topics':
          analysis = await aiService.extractTopics(content);
          break;
        case 'entities':
          analysis = await aiService.extractEntities(content);
          break;
        default:
          analysis = await aiService.generateAnswer(
            `Analyze this content: ${content}`,
            '',
            {
              temperature: agent.config.temperature,
              maxTokens: agent.config.maxTokens
            }
          );
      }

      return {
        analysisType,
        content: content.substring(0, 200) + '...',
        result: analysis,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Analysis task error:', error);
      throw error;
    }
  }

  async executeSummarizationTask(task, agent) {
    try {
      const { content, maxLength } = task.input;
      const aiService = getService('ai');

      const summary = await aiService.summarizeText(content, maxLength || 150);

      return {
        originalLength: content.length,
        summaryLength: summary.length,
        summary,
        compressionRatio: (content.length - summary.length) / content.length
      };
    } catch (error) {
      console.error('Summarization task error:', error);
      throw error;
    }
  }

  async executeComparisonTask(task, agent) {
    try {
      const { documents, comparisonType } = task.input;
      const aiService = getService('ai');

      if (documents.length < 2) {
        throw new Error('At least 2 documents required for comparison');
      }

      const content1 = documents[0].content || documents[0].text;
      const content2 = documents[1].content || documents[1].text;

      const comparisonPrompt = `Compare the following documents and provide insights on ${comparisonType || 'similarities and differences'}:
      
      Document 1: ${content1.substring(0, 1000)}...
      Document 2: ${content2.substring(0, 1000)}...`;

      const comparison = await aiService.generateAnswer(comparisonPrompt, '', {
        temperature: agent.config.temperature,
        maxTokens: agent.config.maxTokens
      });

      return {
        comparisonType: comparisonType || 'general',
        documents: documents.length,
        comparison: comparison.answer,
        confidence: comparison.confidence
      };
    } catch (error) {
      console.error('Comparison task error:', error);
      throw error;
    }
  }

  async executeValidationTask(task, agent) {
    try {
      const { content, validationType } = task.input;
      const aiService = getService('ai');

      let validation;
      switch (validationType) {
        case 'fact_check':
          validation = await aiService.generateAnswer(
            `Fact-check this content and identify any inaccuracies: ${content}`,
            '',
            {
              temperature: agent.config.temperature,
              maxTokens: agent.config.maxTokens
            }
          );
          break;
        case 'consistency':
          validation = await aiService.generateAnswer(
            `Check this content for internal consistency: ${content}`,
            '',
            {
              temperature: agent.config.temperature,
              maxTokens: agent.config.maxTokens
            }
          );
          break;
        default:
          validation = await aiService.generateAnswer(
            `Validate this content: ${content}`,
            '',
            {
              temperature: agent.config.temperature,
              maxTokens: agent.config.maxTokens
            }
          );
      }

      return {
        validationType: validationType || 'general',
        content: content.substring(0, 200) + '...',
        validation: validation.answer,
        confidence: validation.confidence
      };
    } catch (error) {
      console.error('Validation task error:', error);
      throw error;
    }
  }

  updateTaskStatus(taskId, status, data = {}) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
      
      if (status === 'completed' || status === 'failed') {
        task.completedAt = new Date();
      }
      
      Object.assign(task, data);
      this.tasks.set(taskId, task);
    }
  }

  async getTask(taskId) {
    return this.tasks.get(taskId);
  }

  async getAllTasks() {
    return Array.from(this.tasks.values());
  }

  async getTasksByAgent(agentId) {
    return Array.from(this.tasks.values()).filter(task => task.agentId === agentId);
  }

  generateAgentId() {
    return 'agent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getStats() {
    return {
      totalAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values()).filter(a => a.isActive).length,
      totalTasks: this.tasks.size,
      pendingTasks: Array.from(this.tasks.values()).filter(t => t.status === 'pending').length,
      runningTasks: Array.from(this.tasks.values()).filter(t => t.status === 'running').length,
      completedTasks: Array.from(this.tasks.values()).filter(t => t.status === 'completed').length,
      failedTasks: Array.from(this.tasks.values()).filter(t => t.status === 'failed').length
    };
  }
}

export { AgentService };

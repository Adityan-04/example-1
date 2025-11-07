import express from 'express';
import { getService } from '../services/index.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Get user's AI agents
router.get('/', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    
    const agents = await agentService.getUserAgents(userId);
    
    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI agents',
      error: error.message
    });
  }
});

// Create a new AI agent
router.post('/', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    const { name, description, type, configuration, documents } = req.body;
    
    const agent = await agentService.createAgent(userId, {
      name,
      description,
      type,
      configuration,
      documents
    });
    
    res.status(201).json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create AI agent',
      error: error.message
    });
  }
});

// Get agent details
router.get('/:agentId', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    const { agentId } = req.params;
    
    const agent = await agentService.getAgentDetails(userId, agentId);
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Get agent details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent details',
      error: error.message
    });
  }
});

// Update agent
router.put('/:agentId', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    const { agentId } = req.params;
    const updateData = req.body;
    
    const agent = await agentService.updateAgent(userId, agentId, updateData);
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent',
      error: error.message
    });
  }
});

// Delete agent
router.delete('/:agentId', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    const { agentId } = req.params;
    
    await agentService.deleteAgent(userId, agentId);
    
    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent',
      error: error.message
    });
  }
});

// Execute agent task
router.post('/:agentId/execute', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    const { agentId } = req.params;
    const { task, parameters, context } = req.body;
    
    const result = await agentService.executeTask(userId, agentId, {
      task,
      parameters,
      context
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Execute agent task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute agent task',
      error: error.message
    });
  }
});

// Get agent tasks
router.get('/:agentId/tasks', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    const { agentId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    
    const tasks = await agentService.getAgentTasks(userId, agentId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get agent tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent tasks',
      error: error.message
    });
  }
});

// Get task details
router.get('/:agentId/tasks/:taskId', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    const { agentId, taskId } = req.params;
    
    const task = await agentService.getTaskDetails(userId, agentId, taskId);
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Get task details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task details',
      error: error.message
    });
  }
});

// Cancel task
router.post('/:agentId/tasks/:taskId/cancel', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    const { agentId, taskId } = req.params;
    
    const result = await agentService.cancelTask(userId, agentId, taskId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Cancel task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel task',
      error: error.message
    });
  }
});

// Get agent performance metrics
router.get('/:agentId/metrics', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    const { agentId } = req.params;
    const { timeframe = '30d' } = req.query;
    
    const metrics = await agentService.getAgentMetrics(userId, agentId, timeframe);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get agent metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent metrics',
      error: error.message
    });
  }
});

// Train agent
router.post('/:agentId/train', async (req, res) => {
  try {
    const agentService = getService('agent');
    const userId = req.user.id;
    const { agentId } = req.params;
    const { trainingData, options } = req.body;
    
    const result = await agentService.trainAgent(userId, agentId, {
      trainingData,
      options
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Train agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to train agent',
      error: error.message
    });
  }
});

export default router;
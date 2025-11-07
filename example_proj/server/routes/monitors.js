import express from 'express';
import { getService } from '../services/index.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Get user's web monitors
router.get('/', async (req, res) => {
  try {
    const webMonitorService = getService('webMonitor');
    const userId = req.user.id;
    
    const monitors = await webMonitorService.getUserMonitors(userId);
    
    res.json({
      success: true,
      data: monitors
    });
  } catch (error) {
    console.error('Get monitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch web monitors',
      error: error.message
    });
  }
});

// Create a new web monitor
router.post('/', async (req, res) => {
  try {
    const webMonitorService = getService('webMonitor');
    const userId = req.user.id;
    const { url, name, description, settings } = req.body;
    
    const monitor = await webMonitorService.createMonitor(userId, {
      url,
      name,
      description,
      settings
    });
    
    res.status(201).json({
      success: true,
      data: monitor
    });
  } catch (error) {
    console.error('Create monitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create web monitor',
      error: error.message
    });
  }
});

// Get monitor details
router.get('/:monitorId', async (req, res) => {
  try {
    const webMonitorService = getService('webMonitor');
    const userId = req.user.id;
    const { monitorId } = req.params;
    
    const monitor = await webMonitorService.getMonitorDetails(userId, monitorId);
    
    res.json({
      success: true,
      data: monitor
    });
  } catch (error) {
    console.error('Get monitor details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitor details',
      error: error.message
    });
  }
});

// Update monitor
router.put('/:monitorId', async (req, res) => {
  try {
    const webMonitorService = getService('webMonitor');
    const userId = req.user.id;
    const { monitorId } = req.params;
    const updateData = req.body;
    
    const monitor = await webMonitorService.updateMonitor(userId, monitorId, updateData);
    
    res.json({
      success: true,
      data: monitor
    });
  } catch (error) {
    console.error('Update monitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update monitor',
      error: error.message
    });
  }
});

// Delete monitor
router.delete('/:monitorId', async (req, res) => {
  try {
    const webMonitorService = getService('webMonitor');
    const userId = req.user.id;
    const { monitorId } = req.params;
    
    await webMonitorService.deleteMonitor(userId, monitorId);
    
    res.json({
      success: true,
      message: 'Monitor deleted successfully'
    });
  } catch (error) {
    console.error('Delete monitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete monitor',
      error: error.message
    });
  }
});

// Start monitoring
router.post('/:monitorId/start', async (req, res) => {
  try {
    const webMonitorService = getService('webMonitor');
    const userId = req.user.id;
    const { monitorId } = req.params;
    
    const result = await webMonitorService.startMonitoring(userId, monitorId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Start monitoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start monitoring',
      error: error.message
    });
  }
});

// Stop monitoring
router.post('/:monitorId/stop', async (req, res) => {
  try {
    const webMonitorService = getService('webMonitor');
    const userId = req.user.id;
    const { monitorId } = req.params;
    
    const result = await webMonitorService.stopMonitoring(userId, monitorId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Stop monitoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop monitoring',
      error: error.message
    });
  }
});

// Get monitor history
router.get('/:monitorId/history', async (req, res) => {
  try {
    const webMonitorService = getService('webMonitor');
    const userId = req.user.id;
    const { monitorId } = req.params;
    const { page = 1, limit = 50, timeframe = '7d' } = req.query;
    
    const history = await webMonitorService.getMonitorHistory(userId, monitorId, {
      page: parseInt(page),
      limit: parseInt(limit),
      timeframe
    });
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get monitor history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitor history',
      error: error.message
    });
  }
});

// Get monitor alerts
router.get('/:monitorId/alerts', async (req, res) => {
  try {
    const webMonitorService = getService('webMonitor');
    const userId = req.user.id;
    const { monitorId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    
    const alerts = await webMonitorService.getMonitorAlerts(userId, monitorId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Get monitor alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitor alerts',
      error: error.message
    });
  }
});

// Test monitor
router.post('/:monitorId/test', async (req, res) => {
  try {
    const webMonitorService = getService('webMonitor');
    const userId = req.user.id;
    const { monitorId } = req.params;
    
    const testResult = await webMonitorService.testMonitor(userId, monitorId);
    
    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('Test monitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test monitor',
      error: error.message
    });
  }
});

export default router;
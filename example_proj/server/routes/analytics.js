import express from 'express';
import { getService } from '../services/index.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Get analytics dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    
    const dashboardData = await analyticsService.getDashboardData(userId);
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics dashboard data',
      error: error.message
    });
  }
});

// Get document analytics
router.get('/documents', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { timeframe = '30d', type = 'all' } = req.query;
    
    const documentAnalytics = await analyticsService.getDocumentAnalytics(userId, {
      timeframe,
      type
    });
    
    res.json({
      success: true,
      data: documentAnalytics
    });
  } catch (error) {
    console.error('Document analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document analytics',
      error: error.message
    });
  }
});

// Get query analytics
router.get('/queries', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { timeframe = '30d', limit = 100 } = req.query;
    
    const queryAnalytics = await analyticsService.getQueryAnalytics(userId, {
      timeframe,
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: queryAnalytics
    });
  } catch (error) {
    console.error('Query analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch query analytics',
      error: error.message
    });
  }
});

// Get user activity analytics
router.get('/activity', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { timeframe = '7d' } = req.query;
    
    const activityData = await analyticsService.getUserActivity(userId, timeframe);
    
    res.json({
      success: true,
      data: activityData
    });
  } catch (error) {
    console.error('User activity analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity data',
      error: error.message
    });
  }
});

// Get system performance metrics
router.get('/performance', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    
    const performanceData = await analyticsService.getPerformanceMetrics(userId);
    
    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics',
      error: error.message
    });
  }
});

// Get AI model usage statistics
router.get('/ai-usage', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { timeframe = '30d' } = req.query;
    
    const aiUsageData = await analyticsService.getAIUsageStats(userId, timeframe);
    
    res.json({
      success: true,
      data: aiUsageData
    });
  } catch (error) {
    console.error('AI usage analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI usage statistics',
      error: error.message
    });
  }
});

// Export analytics data
router.post('/export', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { type, timeframe, format = 'json' } = req.body;
    
    const exportData = await analyticsService.exportAnalytics(userId, {
      type,
      timeframe,
      format
    });
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data',
      error: error.message
    });
  }
});

export default router;
import express from 'express';
import { getService } from '../services/index.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Get user's teams
router.get('/', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    
    const teams = await analyticsService.getUserTeams(userId);
    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teams',
      error: error.message
    });
  }
});

// Create a new team
router.post('/', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { name, description, settings } = req.body;
    
    const team = await analyticsService.createTeam(userId, {
      name,
      description,
      settings
    });
    
    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team',
      error: error.message
    });
  }
});

// Get team details
router.get('/:teamId', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { teamId } = req.params;
    
    const team = await analyticsService.getTeamDetails(userId, teamId);
    
    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Get team details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team details',
      error: error.message
    });
  }
});

// Update team
router.put('/:teamId', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { teamId } = req.params;
    const updateData = req.body;
    
    const team = await analyticsService.updateTeam(userId, teamId, updateData);
    
    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team',
      error: error.message
    });
  }
});

// Delete team
router.delete('/:teamId', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { teamId } = req.params;
    
    await analyticsService.deleteTeam(userId, teamId);
    
    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team',
      error: error.message
    });
  }
});

// Add member to team
router.post('/:teamId/members', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { teamId } = req.params;
    const { email, role = 'member' } = req.body;
    
    const member = await analyticsService.addTeamMember(userId, teamId, {
      email,
      role
    });
    
    res.status(201).json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add team member',
      error: error.message
    });
  }
});

// Remove member from team
router.delete('/:teamId/members/:memberId', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { teamId, memberId } = req.params;
    
    await analyticsService.removeTeamMember(userId, teamId, memberId);
    
    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove team member',
      error: error.message
    });
  }
});

// Update member role
router.put('/:teamId/members/:memberId', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { teamId, memberId } = req.params;
    const { role } = req.body;
    
    const member = await analyticsService.updateMemberRole(userId, teamId, memberId, role);
    
    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update member role',
      error: error.message
    });
  }
});

// Get team documents
router.get('/:teamId/documents', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { teamId } = req.params;
    const { page = 1, limit = 20, search } = req.query;
    
    const documents = await analyticsService.getTeamDocuments(userId, teamId, {
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });
    
    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get team documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team documents',
      error: error.message
    });
  }
});

// Share document with team
router.post('/:teamId/documents/:documentId/share', async (req, res) => {
  try {
    const analyticsService = getService('analytics');
    const userId = req.user.id;
    const { teamId, documentId } = req.params;
    const { permissions = 'read' } = req.body;
    
    const shareResult = await analyticsService.shareDocumentWithTeam(userId, teamId, documentId, permissions);
    
    res.json({
      success: true,
      data: shareResult
    });
  } catch (error) {
    console.error('Share document with team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share document with team',
      error: error.message
    });
  }
});

export default router;
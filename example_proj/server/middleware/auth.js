import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// JWT token authentication middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role || 'user';
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Team ownership/access middleware
export const requireTeamAccess = (permission = 'read') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const teamId = req.params.teamId;
      if (!teamId) {
        return res.status(400).json({
          success: false,
          message: 'Team ID required'
        });
      }

      // Check if user has access to the team
      const hasAccess = await checkTeamAccess(req.user.id, teamId, permission);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this team'
        });
      }

      next();
    } catch (error) {
      console.error('Team access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify team access',
        error: error.message
      });
    }
  };
};

// Helper function to check team access
const checkTeamAccess = async (userId, teamId, permission) => {
  try {
    // This would typically query a team membership model
    // For now, we'll implement a basic check
    const Team = (await import('../models/Team.js')).default;
    const team = await Team.findById(teamId);
    
    if (!team) return false;

    // Check if user is owner
    if (team.owner.toString() === userId.toString()) {
      return true;
    }

    // Check if user is a member with appropriate permissions
    const membership = team.members.find(
      member => member.user.toString() === userId.toString()
    );

    if (!membership) return false;

    // Check permission level
    switch (permission) {
      case 'read':
        return ['read', 'write', 'admin'].includes(membership.role);
      case 'write':
        return ['write', 'admin'].includes(membership.role);
      case 'admin':
        return membership.role === 'admin';
      default:
        return false;
    }
  } catch (error) {
    console.error('Team access check error:', error);
    return false;
  }
};

// Rate limiting per user
export const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(userId)) {
      const userRequests = requests.get(userId);
      const validRequests = userRequests.filter(time => time > windowStart);
      requests.set(userId, validRequests);
    } else {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
      });
    }

    userRequests.push(now);
    next();
  };
};
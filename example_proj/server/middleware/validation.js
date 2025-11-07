import { body, param, query, validationResult } from 'express-validator';

// Validation result handler
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User registration validation
export const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  validateRequest
];

// User login validation
export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateRequest
];

// Document upload validation
export const validateDocumentUpload = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  validateRequest
];

// Query validation
export const validateQuery = [
  body('query')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Query must be between 1 and 1000 characters'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  validateRequest
];

// Team creation validation
export const validateTeamCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  validateRequest
];

// Team member validation
export const validateTeamMember = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('role')
    .optional()
    .isIn(['read', 'write', 'admin'])
    .withMessage('Role must be one of: read, write, admin'),
  validateRequest
];

// Web monitor validation
export const validateWebMonitor = [
  body('url')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Please provide a valid URL'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Monitor name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  validateRequest
];

// Agent creation validation
export const validateAgentCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Agent name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('type')
    .isIn(['analyzer', 'summarizer', 'comparator', 'monitor', 'custom'])
    .withMessage('Agent type must be one of: analyzer, summarizer, comparator, monitor, custom'),
  body('configuration')
    .isObject()
    .withMessage('Configuration must be an object'),
  body('documents')
    .optional()
    .isArray()
    .withMessage('Documents must be an array'),
  validateRequest
];

// Agent task validation
export const validateAgentTask = [
  body('task')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Task description must be between 1 and 500 characters'),
  body('parameters')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object'),
  validateRequest
];

// MongoDB ObjectId validation
export const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} ID format`),
  validateRequest
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validateRequest
];

// Search validation
export const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  query('type')
    .optional()
    .isIn(['documents', 'queries', 'teams', 'agents', 'monitors'])
    .withMessage('Search type must be one of: documents, queries, teams, agents, monitors'),
  validateRequest
];

// Timeframe validation
export const validateTimeframe = [
  query('timeframe')
    .optional()
    .isIn(['1h', '24h', '7d', '30d', '90d', '1y'])
    .withMessage('Timeframe must be one of: 1h, 24h, 7d, 30d, 90d, 1y'),
  validateRequest
];

// File type validation
export const validateFileType = (allowedTypes) => [
  body('fileType')
    .optional()
    .isIn(allowedTypes)
    .withMessage(`File type must be one of: ${allowedTypes.join(', ')}`),
  validateRequest
];

// Settings validation
export const validateSettings = [
  body('settings')
    .isObject()
    .withMessage('Settings must be an object'),
  body('settings.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be one of: light, dark, auto'),
  body('settings.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters'),
  body('settings.notifications')
    .optional()
    .isObject()
    .withMessage('Notifications settings must be an object'),
  validateRequest
];

// Export all validations
export const validations = {
  userRegistration: validateUserRegistration,
  userLogin: validateUserLogin,
  documentUpload: validateDocumentUpload,
  query: validateQuery,
  teamCreation: validateTeamCreation,
  teamMember: validateTeamMember,
  webMonitor: validateWebMonitor,
  agentCreation: validateAgentCreation,
  agentTask: validateAgentTask,
  objectId: validateObjectId,
  pagination: validatePagination,
  search: validateSearch,
  timeframe: validateTimeframe,
  fileType: validateFileType,
  settings: validateSettings
};
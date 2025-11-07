import express from 'express';
import { body, validationResult } from 'express-validator';
import { getService } from '../services/index.js';
import Document from '../models/Document.js';

const router = express.Router();

// Search documents
router.post('/search', [
  body('query').trim().isLength({ min: 1 }).withMessage('Query is required'),
  body('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  body('threshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Threshold must be between 0 and 1'),
  body('useHybrid').optional().isBoolean().withMessage('useHybrid must be boolean'),
  body('documentIds').optional().isArray().withMessage('documentIds must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      query,
      limit = 10,
      threshold = 0.7,
      useHybrid = true,
      documentIds = null
    } = req.body;

    const userId = req.user.userId;

    // Get search service
    const searchService = getService('search');

    let results = [];

    if (documentIds && documentIds.length > 0) {
      // Search within specific documents
      for (const docId of documentIds) {
        const docResults = await searchService.searchByDocument(docId, query, { limit: Math.ceil(limit / documentIds.length) });
        results.push(...docResults);
      }
    } else {
      // Search all user's documents
      results = await searchService.search(query, {
        limit,
        threshold,
        useHybrid
      });
    }

    // Filter results to only include user's documents
    const userDocuments = await Document.find({ owner: userId }).select('_id');
    const userDocumentIds = new Set(userDocuments.map(doc => doc._id.toString()));
    
    results = results.filter(result => userDocumentIds.has(result.documentId));

    // Add document metadata
    const documentMap = new Map();
    const documentIds = [...new Set(results.map(r => r.documentId))];
    const documents = await Document.find({ _id: { $in: documentIds } }).select('_id title metadata');
    
    documents.forEach(doc => {
      documentMap.set(doc._id.toString(), doc);
    });

    results = results.map(result => ({
      ...result,
      document: documentMap.get(result.documentId)
    }));

    res.json({
      success: true,
      data: {
        query,
        results,
        totalResults: results.length,
        searchTime: Date.now() - req.startTime
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Ask question (RAG)
router.post('/ask', [
  body('question').trim().isLength({ min: 1 }).withMessage('Question is required'),
  body('context').optional().isObject().withMessage('Context must be an object'),
  body('documentIds').optional().isArray().withMessage('documentIds must be an array'),
  body('includeReasoning').optional().isBoolean().withMessage('includeReasoning must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      question,
      context = {},
      documentIds = null,
      includeReasoning = true
    } = req.body;

    const userId = req.user.userId;
    const startTime = Date.now();

    // Get services
    const searchService = getService('search');
    const aiService = getService('ai');

    // Search for relevant documents
    let searchResults = [];
    if (documentIds && documentIds.length > 0) {
      // Search within specific documents
      for (const docId of documentIds) {
        const docResults = await searchService.searchByDocument(docId, question, { limit: 5 });
        searchResults.push(...docResults);
      }
    } else {
      // Search all user's documents
      searchResults = await searchService.search(question, {
        limit: 10,
        threshold: 0.6,
        useHybrid: true
      });
    }

    // Filter to user's documents
    const userDocuments = await Document.find({ owner: userId }).select('_id');
    const userDocumentIds = new Set(userDocuments.map(doc => doc._id.toString()));
    searchResults = searchResults.filter(result => userDocumentIds.has(result.documentId));

    // Prepare context for AI
    const contextText = searchResults
      .map(result => `Document: ${result.title}\nContent: ${result.content}`)
      .join('\n\n');

    // Generate answer using AI
    const aiResult = await aiService.generateAnswer(question, contextText, {
      includeReasoning,
      temperature: 0.3,
      maxTokens: 1000
    });

    // Generate follow-up questions
    const followUpQuestions = await aiService.generateFollowUpQuestions(question, contextText);

    // Prepare citations
    const citations = searchResults.map(result => ({
      id: result.id,
      title: result.title,
      url: `#document-${result.documentId}`,
      relevanceScore: result.relevanceScore,
      excerpt: result.content.substring(0, 200) + '...',
      documentId: result.documentId
    }));

    // Update document analytics
    for (const result of searchResults) {
      await Document.findByIdAndUpdate(result.documentId, {
        $inc: { 'analytics.queries': 1 },
        $set: { 'analytics.lastAccessed': new Date() }
      });
    }

    const response = {
      success: true,
      data: {
        question,
        answer: aiResult.answer,
        reasoning: aiResult.reasoning,
        confidence: aiResult.confidence,
        sources: searchResults,
        citations,
        followUpQuestions,
        executionTime: Date.now() - startTime,
        metadata: {
          totalSources: searchResults.length,
          model: aiResult.model || 'gpt-4-turbo-preview'
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Ask question error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process question'
    });
  }
});

// Get similar documents
router.get('/similar/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { limit = 5 } = req.query;
    const userId = req.user.userId;

    // Verify document ownership
    const document = await Document.findOne({ _id: documentId, owner: userId });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Get search service
    const searchService = getService('search');
    const similarDocs = await searchService.getSimilarDocuments(documentId, parseInt(limit));

    // Filter to user's documents
    const userDocuments = await Document.find({ owner: userId }).select('_id');
    const userDocumentIds = new Set(userDocuments.map(doc => doc._id.toString()));
    const filteredDocs = similarDocs.filter(doc => userDocumentIds.has(doc.id));

    res.json({
      success: true,
      data: filteredDocs
    });
  } catch (error) {
    console.error('Similar documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find similar documents'
    });
  }
});

// Get document suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { query, limit = 5 } = req.query;
    const userId = req.user.userId;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get search service
    const searchService = getService('search');
    const results = await searchService.search(query, {
      limit: parseInt(limit),
      threshold: 0.5,
      useHybrid: true
    });

    // Filter to user's documents
    const userDocuments = await Document.find({ owner: userId }).select('_id');
    const userDocumentIds = new Set(userDocuments.map(doc => doc._id.toString()));
    const filteredResults = results.filter(result => userDocumentIds.has(result.documentId));

    // Format suggestions
    const suggestions = filteredResults.map(result => ({
      id: result.id,
      title: result.title,
      content: result.content.substring(0, 100) + '...',
      relevanceScore: result.relevanceScore,
      documentId: result.documentId
    }));

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

// Compare documents
router.post('/compare', [
  body('documentIds').isArray({ min: 2 }).withMessage('At least 2 documents required for comparison'),
  body('aspects').optional().isArray().withMessage('Aspects must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { documentIds, aspects = ['content', 'topics', 'entities'] } = req.body;
    const userId = req.user.userId;

    // Verify document ownership
    const documents = await Document.find({
      _id: { $in: documentIds },
      owner: userId
    });

    if (documents.length !== documentIds.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more documents not found'
      });
    }

    // Get AI service for comparison
    const aiService = getService('ai');

    // Prepare comparison data
    const comparisonData = documents.map(doc => ({
      id: doc._id,
      title: doc.title,
      content: doc.extractedText + ' ' + doc.ocrText,
      summary: doc.summary,
      entities: doc.entities || [],
      topics: doc.topics || [],
      metadata: doc.metadata
    }));

    // Generate comparison using AI
    const comparisonPrompt = `Compare the following documents and provide insights on the specified aspects: ${aspects.join(', ')}. 
    
    Documents:
    ${comparisonData.map((doc, index) => `
    Document ${index + 1}: ${doc.title}
    Content: ${doc.content.substring(0, 1000)}...
    Summary: ${doc.summary}
    `).join('\n')}`;

    const comparison = await aiService.generateAnswer(comparisonPrompt, '', {
      temperature: 0.3,
      maxTokens: 1500
    });

    res.json({
      success: true,
      data: {
        documents: comparisonData,
        comparison: comparison.answer,
        aspects,
        metadata: {
          totalDocuments: documents.length,
          comparisonTime: Date.now() - req.startTime
        }
      }
    });
  } catch (error) {
    console.error('Document comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare documents'
    });
  }
});

// Get query history
router.get('/history', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.userId;

    // In a real implementation, you'd store query history in a separate collection
    // For now, we'll return a mock response
    const history = [
      {
        id: '1',
        query: 'What are the main topics discussed?',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        resultsCount: 5
      },
      {
        id: '2',
        query: 'Summarize the key findings',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        resultsCount: 3
      }
    ];

    res.json({
      success: true,
      data: history.slice(offset, offset + limit),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: history.length
      }
    });
  } catch (error) {
    console.error('Query history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get query history'
    });
  }
});

export default router;

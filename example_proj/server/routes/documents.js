import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { body, validationResult } from 'express-validator';
import Document from '../models/Document.js';
import { getService } from '../services/index.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/documents';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'text/html', 'application/rtf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, TXT, MD, HTML, and RTF files are allowed.'), false);
    }
  }
});

// Get all documents for user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type, status } = req.query;
    const userId = req.user.userId;

    // Build query
    const query = { owner: userId };
    if (type) query.fileType = type;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'metadata.keywords': { $regex: search, $options: 'i' } },
        { extractedText: { $regex: search, $options: 'i' } }
      ];
    }

    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-embeddings -extractedText -ocrText');

    const total = await Document.countDocuments(query);

    res.json({
      success: true,
      data: documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents'
    });
  }
});

// Get single document
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const document = await Document.findOne({ _id: id, owner: userId });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document'
    });
  }
});

// Upload document
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const userId = req.user.userId;
    const { title, description, tags } = req.body;

    // Check user's upload limits
    const user = await User.findById(userId);
    if (!user.canUploadDocument(req.file.size)) {
      return res.status(400).json({
        success: false,
        error: 'Upload limit exceeded. Please upgrade your plan.'
      });
    }

    // Create document record
    const document = new Document({
      title: title || req.file.originalname,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype.split('/')[1],
      mimeType: req.file.mimetype,
      size: req.file.size,
      owner: userId,
      status: 'processing',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      metadata: {
        title: title || req.file.originalname,
        language: 'en',
        createdAt: new Date(),
        modifiedAt: new Date()
      }
    });

    await document.save();

    // Start processing document in background
    processDocument(document._id).catch(error => {
      console.error('Document processing error:', error);
      // Update document status to error
      Document.findByIdAndUpdate(document._id, {
        status: 'error',
        errorLog: [{
          step: 'processing',
          error: error.message,
          timestamp: new Date()
        }]
      }).catch(console.error);
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document'
    });
  }
});

// Process document (background task)
async function processDocument(documentId) {
  try {
    const document = await Document.findById(documentId);
    if (!document) return;

    console.log(`Processing document: ${document.title}`);

    // Step 1: Extract text
    document.processingStatus.textExtraction = 'processing';
    await document.save();

    const documentService = getService('document');
    const extractedText = await documentService.extractText(document.filePath, document.fileType);
    
    document.extractedText = extractedText;
    document.processingStatus.textExtraction = 'completed';
    await document.save();

    // Step 2: OCR if needed (for scanned PDFs)
    if (document.fileType === 'pdf') {
      document.processingStatus.ocrProcessing = 'processing';
      await document.save();

      const ocrService = getService('ocr');
      const ocrResult = await ocrService.extractTextFromScannedDocument(
        document.filePath,
        'pdf',
        { language: 'en' }
      );

      if (ocrResult.text && ocrResult.text.trim().length > 0) {
        document.ocrText = ocrResult.text;
        document.processingStatus.ocrProcessing = 'completed';
      } else {
        document.processingStatus.ocrProcessing = 'skipped';
      }
      await document.save();
    }

    // Step 3: Generate summary
    const aiService = getService('ai');
    const summary = await aiService.summarizeText(document.extractedText + ' ' + document.ocrText);
    document.summary = summary;
    await document.save();

    // Step 4: Extract entities
    document.processingStatus.entityExtraction = 'processing';
    await document.save();

    const entities = await aiService.extractEntities(document.extractedText + ' ' + document.ocrText);
    document.entities = entities;
    document.processingStatus.entityExtraction = 'completed';
    await document.save();

    // Step 5: Extract topics
    document.processingStatus.topicModeling = 'processing';
    await document.save();

    const topics = await aiService.extractTopics(document.extractedText + ' ' + document.ocrText);
    document.topics = topics;
    document.processingStatus.topicModeling = 'completed';
    await document.save();

    // Step 6: Generate embeddings
    document.processingStatus.embeddingGeneration = 'processing';
    await document.save();

    const embeddingService = getService('embedding');
    const embeddings = await embeddingService.generateDocumentEmbeddings(document);
    document.embeddings = embeddings;
    document.processingStatus.embeddingGeneration = 'completed';
    await document.save();

    // Step 7: Update search index
    const searchService = getService('search');
    await searchService.updateDocument(documentId);

    // Mark as ready
    document.status = 'ready';
    await document.save();

    console.log(`Document processed successfully: ${document.title}`);
  } catch (error) {
    console.error('Document processing error:', error);
    await Document.findByIdAndUpdate(documentId, {
      status: 'error',
      errorLog: [{
        step: 'processing',
        error: error.message,
        timestamp: new Date()
      }]
    });
  }
}

// Update document
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
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

    const { id } = req.params;
    const userId = req.user.userId;
    const { title, tags, isPublic } = req.body;

    const document = await Document.findOne({ _id: id, owner: userId });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Update fields
    if (title) document.title = title;
    if (tags) document.tags = tags;
    if (typeof isPublic === 'boolean') document.isPublic = isPublic;

    await document.save();

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: document
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update document'
    });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const document = await Document.findOne({ _id: id, owner: userId });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.filePath);
    } catch (fileError) {
      console.warn('Could not delete file:', fileError.message);
    }

    // Remove from search index
    const searchService = getService('search');
    await searchService.removeDocumentFromIndex(id);

    // Delete document record
    await Document.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
});

// Download document
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const document = await Document.findOne({ _id: id, owner: userId });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(document.filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }

    // Update download count
    document.analytics.downloadCount += 1;
    await document.save();

    res.download(document.filePath, document.originalName);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document'
    });
  }
});

// Get document content (for preview)
router.get('/:id/content', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const document = await Document.findOne({ _id: id, owner: userId });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: {
        extractedText: document.extractedText,
        ocrText: document.ocrText,
        summary: document.summary,
        entities: document.entities,
        topics: document.topics
      }
    });
  } catch (error) {
    console.error('Error fetching document content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document content'
    });
  }
});

export default router;

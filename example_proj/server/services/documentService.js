import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { JSDOM } from 'jsdom';
import cheerio from 'cheerio';

class DocumentService {
  constructor() {
    this.supportedTypes = {
      'application/pdf': this.extractFromPDF,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.extractFromDocx,
      'text/plain': this.extractFromText,
      'text/markdown': this.extractFromMarkdown,
      'text/html': this.extractFromHTML,
      'application/rtf': this.extractFromRTF
    };
  }

  async initialize() {
    console.log('📄 Document service initialized');
  }

  async extractText(filePath, mimeType) {
    try {
      const extractor = this.supportedTypes[mimeType];
      if (!extractor) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const text = await extractor(filePath);
      return text.trim();
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  async extractFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  async extractFromDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  async extractFromText(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('Text file extraction error:', error);
      throw new Error('Failed to extract text from text file');
    }
  }

  async extractFromMarkdown(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      // Simple markdown to text conversion
      return content
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
        .replace(/`([^`]+)`/g, '$1') // Remove code
        .replace(/\n{3,}/g, '\n\n'); // Normalize line breaks
    } catch (error) {
      console.error('Markdown extraction error:', error);
      throw new Error('Failed to extract text from Markdown');
    }
  }

  async extractFromHTML(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const $ = cheerio.load(content);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Extract text content
      const text = $.text();
      
      // Clean up whitespace
      return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
    } catch (error) {
      console.error('HTML extraction error:', error);
      throw new Error('Failed to extract text from HTML');
    }
  }

  async extractFromRTF(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Simple RTF to text conversion
      // Remove RTF control codes
      let text = content
        .replace(/\\[a-z]+\d*\s?/g, '') // Remove RTF commands
        .replace(/\{[^}]*\}/g, '') // Remove RTF groups
        .replace(/\\[{}]/g, '') // Remove remaining RTF escapes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      return text;
    } catch (error) {
      console.error('RTF extraction error:', error);
      throw new Error('Failed to extract text from RTF');
    }
  }

  async getDocumentMetadata(filePath, mimeType) {
    try {
      const stats = await fs.stat(filePath);
      
      const metadata = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        mimeType: mimeType
      };

      // Add type-specific metadata
      if (mimeType === 'application/pdf') {
        try {
          const dataBuffer = await fs.readFile(filePath);
          const pdfData = await pdfParse(dataBuffer);
          metadata.pageCount = pdfData.numpages;
          metadata.title = pdfData.info?.Title || null;
          metadata.author = pdfData.info?.Author || null;
          metadata.subject = pdfData.info?.Subject || null;
          metadata.keywords = pdfData.info?.Keywords || null;
        } catch (error) {
          console.warn('Could not extract PDF metadata:', error.message);
        }
      }

      return metadata;
    } catch (error) {
      console.error('Metadata extraction error:', error);
      return {
        size: 0,
        created: new Date(),
        modified: new Date(),
        mimeType: mimeType
      };
    }
  }

  async validateFile(filePath, mimeType) {
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Check file size (100MB limit)
      const stats = await fs.stat(filePath);
      if (stats.size > 100 * 1024 * 1024) {
        throw new Error('File size exceeds 100MB limit');
      }

      // Check if type is supported
      if (!this.supportedTypes[mimeType]) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      return true;
    } catch (error) {
      console.error('File validation error:', error);
      throw error;
    }
  }

  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`Cleaned up file: ${filePath}`);
    } catch (error) {
      console.error('File cleanup error:', error);
    }
  }

  getSupportedTypes() {
    return Object.keys(this.supportedTypes);
  }

  isTypeSupported(mimeType) {
    return this.supportedTypes.hasOwnProperty(mimeType);
  }
}

export { DocumentService };

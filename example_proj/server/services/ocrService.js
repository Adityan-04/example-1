import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

class OCRService {
  constructor() {
    this.initialized = false;
    this.worker = null;
    this.supportedLanguages = {
      'en': 'eng',
      'es': 'spa',
      'fr': 'fra',
      'de': 'deu',
      'it': 'ita',
      'pt': 'por',
      'ru': 'rus',
      'zh': 'chi_sim',
      'ja': 'jpn',
      'ko': 'kor',
      'ar': 'ara',
      'hi': 'hin'
    };
  }

  async initialize() {
    try {
      console.log('🔍 Initializing OCR service...');
      
      // Initialize Tesseract worker
      this.worker = await Tesseract.createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      // Load English language by default
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
      
      this.initialized = true;
      console.log('✅ OCR service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize OCR service:', error);
      throw error;
    }
  }

  async extractTextFromImage(imagePath, options = {}) {
    const {
      language = 'en',
      pageSegMode = 1, // Automatic page segmentation with OSD
      ocrEngineMode = 3, // Default, based on what is available
      confidenceThreshold = 60,
      preprocess = true
    } = options;

    try {
      if (!this.initialized || !this.worker) {
        throw new Error('OCR service not initialized');
      }

      // Load language if different from current
      const tesseractLang = this.supportedLanguages[language] || 'eng';
      await this.worker.loadLanguage(tesseractLang);
      await this.worker.initialize(tesseractLang);

      // Set page segmentation mode
      await this.worker.setParameters({
        tessedit_pageseg_mode: pageSegMode,
        tessedit_ocr_engine_mode: ocrEngineMode
      });

      let processedImagePath = imagePath;

      // Preprocess image if requested
      if (preprocess) {
        processedImagePath = await this.preprocessImage(imagePath);
      }

      // Perform OCR
      const { data: { text, confidence, words, lines, blocks } } = await this.worker.recognize(processedImagePath);

      // Clean up processed image if it was created
      if (processedImagePath !== imagePath) {
        await fs.unlink(processedImagePath).catch(() => {});
      }

      // Filter results by confidence
      const filteredWords = words.filter(word => word.confidence >= confidenceThreshold);
      const filteredLines = lines.filter(line => line.confidence >= confidenceThreshold);

      return {
        text: text.trim(),
        confidence: confidence,
        words: filteredWords,
        lines: filteredLines,
        blocks: blocks,
        language: language,
        metadata: {
          totalWords: words.length,
          filteredWords: filteredWords.length,
          totalLines: lines.length,
          filteredLines: filteredLines.length,
          confidenceThreshold: confidenceThreshold
        }
      };
    } catch (error) {
      console.error('Error extracting text from image:', error);
      throw error;
    }
  }

  async preprocessImage(imagePath) {
    try {
      const outputPath = imagePath.replace(/\.[^/.]+$/, '_processed.png');
      
      await sharp(imagePath)
        .resize(null, 2000, { // Resize to max height of 2000px
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3
        })
        .sharpen() // Enhance edges
        .normalize() // Normalize contrast
        .modulate({
          brightness: 1.1, // Slightly brighten
          saturation: 1.2, // Increase saturation
          hue: 0
        })
        .png({ quality: 100 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      console.error('Error preprocessing image:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  async extractTextFromPDF(pdfPath, options = {}) {
    const {
      language = 'en',
      pageRange = null, // e.g., [1, 5] for pages 1-5
      dpi = 300,
      confidenceThreshold = 60
    } = options;

    try {
      // This would typically use pdf2pic or similar to convert PDF pages to images
      // For now, we'll simulate the process
      console.log(`Extracting text from PDF: ${pdfPath}`);
      
      // In a real implementation, you would:
      // 1. Convert PDF pages to images using pdf2pic
      // 2. Process each image with OCR
      // 3. Combine results
      
      // For now, return a placeholder
      return {
        text: 'PDF OCR text extraction would be implemented here',
        confidence: 85,
        pages: [],
        language: language,
        metadata: {
          totalPages: 1,
          processedPages: 1,
          dpi: dpi
        }
      };
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  }

  async extractTextFromScannedDocument(filePath, fileType, options = {}) {
    try {
      if (fileType === 'pdf') {
        return await this.extractTextFromPDF(filePath, options);
      } else {
        // For other image formats
        return await this.extractTextFromImage(filePath, options);
      }
    } catch (error) {
      console.error('Error extracting text from scanned document:', error);
      throw error;
    }
  }

  async detectLanguage(text) {
    try {
      // Simple language detection based on character patterns
      const patterns = {
        'zh': /[\u4e00-\u9fff]/g, // Chinese characters
        'ja': /[\u3040-\u309f\u30a0-\u30ff]/g, // Hiragana and Katakana
        'ko': /[\uac00-\ud7af]/g, // Hangul
        'ar': /[\u0600-\u06ff]/g, // Arabic
        'ru': /[\u0400-\u04ff]/g, // Cyrillic
        'hi': /[\u0900-\u097f]/g  // Devanagari
      };

      for (const [lang, pattern] of Object.entries(patterns)) {
        if (pattern.test(text)) {
          return lang;
        }
      }

      // Default to English if no specific pattern matches
      return 'en';
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'en';
    }
  }

  async extractTextWithLayout(imagePath, options = {}) {
    try {
      const result = await this.extractTextFromImage(imagePath, {
        ...options,
        pageSegMode: 6 // Uniform block of text
      });

      // Process the result to extract layout information
      const layout = this.analyzeLayout(result.blocks, result.lines);

      return {
        ...result,
        layout: layout
      };
    } catch (error) {
      console.error('Error extracting text with layout:', error);
      throw error;
    }
  }

  analyzeLayout(blocks, lines) {
    try {
      const layout = {
        columns: [],
        headers: [],
        footers: [],
        tables: [],
        paragraphs: []
      };

      // Analyze blocks for layout structure
      blocks.forEach(block => {
        if (block.level === 2) { // Block level
          const blockText = block.text.trim();
          
          // Simple heuristics for layout analysis
          if (blockText.length < 100 && block.bbox.y0 < 100) {
            layout.headers.push({
              text: blockText,
              bbox: block.bbox,
              confidence: block.confidence
            });
          } else if (blockText.length < 100 && block.bbox.y1 > 800) {
            layout.footers.push({
              text: blockText,
              bbox: block.bbox,
              confidence: block.confidence
            });
          } else {
            layout.paragraphs.push({
              text: blockText,
              bbox: block.bbox,
              confidence: block.confidence
            });
          }
        }
      });

      return layout;
    } catch (error) {
      console.error('Error analyzing layout:', error);
      return { columns: [], headers: [], footers: [], tables: [], paragraphs: [] };
    }
  }

  async batchProcess(images, options = {}) {
    const results = [];
    
    for (const image of images) {
      try {
        const result = await this.extractTextFromImage(image.path, {
          ...options,
          language: image.language || options.language || 'en'
        });
        
        results.push({
          path: image.path,
          success: true,
          result: result
        });
      } catch (error) {
        results.push({
          path: image.path,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async cleanup() {
    try {
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
      }
      this.initialized = false;
    } catch (error) {
      console.error('Error cleaning up OCR service:', error);
    }
  }

  getSupportedLanguages() {
    return Object.keys(this.supportedLanguages);
  }

  isLanguageSupported(language) {
    return this.supportedLanguages.hasOwnProperty(language);
  }
}

export { OCRService };

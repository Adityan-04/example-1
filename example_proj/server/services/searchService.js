import { IndexFlatL2 } from 'faiss-node';
import natural from 'natural';
import { Document } from '../models/Document.js';

class SearchService {
  constructor() {
    this.faissIndex = null;
    this.bm25Index = null;
    this.documents = new Map();
    this.embeddings = [];
    this.documentIds = [];
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔍 Initializing search service...');
      
      // Initialize FAISS index
      this.faissIndex = new IndexFlatL2(1536); // OpenAI embedding dimension
      
      // Initialize BM25
      this.bm25Index = new natural.Bm25Vectorizer();
      
      // Load existing documents
      await this.loadDocuments();
      
      this.initialized = true;
      console.log('✅ Search service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize search service:', error);
      throw error;
    }
  }

  async loadDocuments() {
    try {
      const docs = await Document.find({ 
        status: 'ready',
        'processingStatus.embeddingGeneration': 'completed'
      }).select('_id title extractedText ocrText summary embeddings');

      for (const doc of docs) {
        if (doc.embeddings && doc.embeddings.length > 0) {
          this.addDocumentToIndex(doc);
        }
      }

      console.log(`📚 Loaded ${docs.length} documents into search index`);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  addDocumentToIndex(document) {
    try {
      const docId = document._id.toString();
      const fullText = `${document.extractedText} ${document.ocrText}`.trim();
      
      // Store document metadata
      this.documents.set(docId, {
        id: docId,
        title: document.title,
        content: fullText,
        summary: document.summary || '',
        metadata: {
          type: 'document',
          createdAt: document.createdAt,
          updatedAt: document.updatedAt
        }
      });

      // Add embeddings to FAISS index
      if (document.embeddings && document.embeddings.length > 0) {
        for (const embedding of document.embeddings) {
          if (embedding.vector && embedding.vector.length > 0) {
            this.faissIndex.add(embedding.vector);
            this.embeddings.push(embedding.vector);
            this.documentIds.push(docId);
          }
        }
      }

      // Add to BM25 index
      this.bm25Index.addDocument(fullText, docId);
      
    } catch (error) {
      console.error('Error adding document to index:', error);
    }
  }

  async search(query, options = {}) {
    const {
      limit = 10,
      threshold = 0.7,
      useHybrid = true,
      includeHighlights = true
    } = options;

    try {
      let results = [];

      if (useHybrid) {
        // Hybrid search combining semantic and keyword search
        const semanticResults = await this.semanticSearch(query, limit * 2);
        const keywordResults = await this.keywordSearch(query, limit * 2);
        
        // Combine and re-rank results
        results = this.combineSearchResults(semanticResults, keywordResults, limit);
      } else {
        // Use only semantic search
        results = await this.semanticSearch(query, limit);
      }

      // Filter by threshold
      results = results.filter(result => result.relevanceScore >= threshold);

      // Add highlights if requested
      if (includeHighlights) {
        results = results.map(result => ({
          ...result,
          highlights: this.generateHighlights(result.content, query)
        }));
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('Error performing search:', error);
      return [];
    }
  }

  async semanticSearch(query, limit = 10) {
    try {
      // This would typically use the embedding service to generate query embedding
      // For now, we'll use a simplified approach
      const queryEmbedding = await this.generateQueryEmbedding(query);
      
      if (!queryEmbedding || this.faissIndex.ntotal === 0) {
        return [];
      }

      // Search FAISS index
      const { distances, labels } = this.faissIndex.search(queryEmbedding, Math.min(limit * 2, this.faissIndex.ntotal));
      
      const results = [];
      for (let i = 0; i < labels.length; i++) {
        const docId = this.documentIds[labels[i]];
        const document = this.documents.get(docId);
        
        if (document) {
          results.push({
            id: `${docId}_${i}`,
            documentId: docId,
            title: document.title,
            content: document.content,
            relevanceScore: 1 - (distances[i] / 2), // Normalize distance to 0-1 score
            metadata: document.metadata,
            searchType: 'semantic'
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  async keywordSearch(query, limit = 10) {
    try {
      if (!this.bm25Index) {
        return [];
      }

      const results = this.bm25Index.search(query, limit);
      
      return results.map(result => {
        const docId = result.id;
        const document = this.documents.get(docId);
        
        if (document) {
          return {
            id: `${docId}_keyword`,
            documentId: docId,
            title: document.title,
            content: document.content,
            relevanceScore: result.score,
            metadata: document.metadata,
            searchType: 'keyword'
          };
        }
        return null;
      }).filter(Boolean);
    } catch (error) {
      console.error('Error in keyword search:', error);
      return [];
    }
  }

  combineSearchResults(semanticResults, keywordResults, limit) {
    const combinedResults = new Map();
    
    // Add semantic results with higher weight
    semanticResults.forEach(result => {
      const key = result.documentId;
      const existing = combinedResults.get(key);
      
      if (existing) {
        existing.relevanceScore = Math.max(existing.relevanceScore, result.relevanceScore * 0.8);
        existing.searchType = 'hybrid';
      } else {
        combinedResults.set(key, {
          ...result,
          relevanceScore: result.relevanceScore * 0.8
        });
      }
    });
    
    // Add keyword results
    keywordResults.forEach(result => {
      const key = result.documentId;
      const existing = combinedResults.get(key);
      
      if (existing) {
        existing.relevanceScore = Math.max(existing.relevanceScore, result.relevanceScore * 0.6);
        existing.searchType = 'hybrid';
      } else {
        combinedResults.set(key, {
          ...result,
          relevanceScore: result.relevanceScore * 0.6
        });
      }
    });
    
    // Sort by relevance score and return top results
    return Array.from(combinedResults.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  generateHighlights(content, query) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const highlights = [];
    
    // Simple highlighting based on query words
    queryWords.forEach(word => {
      if (word.length > 2) {
        const regex = new RegExp(`(${word})`, 'gi');
        const matches = [...content.matchAll(regex)];
        
        matches.forEach(match => {
          highlights.push({
            text: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            type: 'keyword'
          });
        });
      }
    });
    
    // Remove overlapping highlights
    const sortedHighlights = highlights.sort((a, b) => a.startIndex - b.startIndex);
    const filteredHighlights = [];
    
    for (const highlight of sortedHighlights) {
      const hasOverlap = filteredHighlights.some(existing => 
        (highlight.startIndex >= existing.startIndex && highlight.startIndex < existing.endIndex) ||
        (highlight.endIndex > existing.startIndex && highlight.endIndex <= existing.endIndex)
      );
      
      if (!hasOverlap) {
        filteredHighlights.push(highlight);
      }
    }
    
    return filteredHighlights.slice(0, 10); // Limit to 10 highlights
  }

  async generateQueryEmbedding(query) {
    // This is a placeholder - in practice, you'd use the embedding service
    // For now, return a random vector for demonstration
    const dimension = 1536;
    return Array.from({ length: dimension }, () => Math.random() - 0.5);
  }

  async searchByDocument(documentId, query, options = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        return [];
      }

      const fullText = `${document.extractedText} ${document.ocrText}`.trim();
      const queryWords = query.toLowerCase().split(/\s+/);
      
      // Simple text search within document
      const results = [];
      const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      sentences.forEach((sentence, index) => {
        const sentenceLower = sentence.toLowerCase();
        const matches = queryWords.filter(word => 
          word.length > 2 && sentenceLower.includes(word)
        );
        
        if (matches.length > 0) {
          results.push({
            id: `${documentId}_${index}`,
            documentId: documentId,
            title: document.title,
            content: sentence.trim(),
            relevanceScore: matches.length / queryWords.length,
            metadata: {
              sentenceIndex: index,
              matches: matches
            },
            searchType: 'document'
          });
        }
      });
      
      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, options.limit || 10);
    } catch (error) {
      console.error('Error searching within document:', error);
      return [];
    }
  }

  async getSimilarDocuments(documentId, limit = 5) {
    try {
      const document = await Document.findById(documentId);
      if (!document || !document.embeddings || document.embeddings.length === 0) {
        return [];
      }

      // Use the first embedding of the document
      const docEmbedding = document.embeddings[0].vector;
      
      // Search for similar documents
      const { distances, labels } = this.faissIndex.search(docEmbedding, limit + 1);
      
      const results = [];
      for (let i = 0; i < labels.length; i++) {
        const similarDocId = this.documentIds[labels[i]];
        
        // Skip the same document
        if (similarDocId === documentId) continue;
        
        const similarDoc = this.documents.get(similarDocId);
        if (similarDoc) {
          results.push({
            id: similarDocId,
            title: similarDoc.title,
            content: similarDoc.content,
            relevanceScore: 1 - (distances[i] / 2),
            metadata: similarDoc.metadata
          });
        }
      }
      
      return results.slice(0, limit);
    } catch (error) {
      console.error('Error finding similar documents:', error);
      return [];
    }
  }

  // Update document in index
  async updateDocument(documentId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) return;

      // Remove old entries
      this.removeDocumentFromIndex(documentId);
      
      // Add updated document
      if (document.status === 'ready' && document.embeddings && document.embeddings.length > 0) {
        this.addDocumentToIndex(document);
      }
    } catch (error) {
      console.error('Error updating document in index:', error);
    }
  }

  // Remove document from index
  removeDocumentFromIndex(documentId) {
    try {
      // Remove from documents map
      this.documents.delete(documentId);
      
      // Remove from FAISS index (this is complex with FAISS, so we'll rebuild)
      // In production, you'd want a more sophisticated approach
      const indicesToRemove = [];
      this.documentIds.forEach((id, index) => {
        if (id === documentId) {
          indicesToRemove.push(index);
        }
      });
      
      // For now, we'll just mark for removal
      // In production, you'd rebuild the index or use a more sophisticated approach
      
    } catch (error) {
      console.error('Error removing document from index:', error);
    }
  }

  // Get index statistics
  getIndexStats() {
    return {
      totalDocuments: this.documents.size,
      totalEmbeddings: this.faissIndex ? this.faissIndex.ntotal : 0,
      initialized: this.initialized
    };
  }
}

export { SearchService };

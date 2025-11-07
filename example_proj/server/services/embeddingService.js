import { getService } from './index.js';

class EmbeddingService {
  constructor() {
    this.chunkSize = 1000; // Characters per chunk
    this.chunkOverlap = 200; // Overlap between chunks
    this.embeddingDimension = 1536; // OpenAI embedding dimension
  }

  async initialize() {
    console.log('🔗 Embedding service initialized');
  }

  async generateDocumentEmbeddings(document) {
    try {
      const fullText = `${document.extractedText} ${document.ocrText}`.trim();
      if (!fullText) {
        throw new Error('No text content to embed');
      }

      // Split document into chunks
      const chunks = this.splitIntoChunks(fullText);
      
      // Generate embeddings for each chunk
      const embeddings = [];
      const aiService = getService('ai');

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          const embedding = await aiService.generateEmbedding(chunk.text);
          
          embeddings.push({
            chunkId: `${document._id}_${i}`,
            text: chunk.text,
            vector: embedding,
            metadata: {
              chunkIndex: i,
              startIndex: chunk.startIndex,
              endIndex: chunk.endIndex,
              documentId: document._id,
              documentTitle: document.title
            }
          });
        } catch (error) {
          console.error(`Error generating embedding for chunk ${i}:`, error);
          // Continue with other chunks
        }
      }

      return embeddings;
    } catch (error) {
      console.error('Document embedding generation error:', error);
      throw error;
    }
  }

  splitIntoChunks(text) {
    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, text.length);
      
      // Try to break at sentence boundary
      let chunkEnd = endIndex;
      if (endIndex < text.length) {
        const lastSentenceEnd = text.lastIndexOf('.', endIndex);
        const lastParagraphEnd = text.lastIndexOf('\n\n', endIndex);
        const breakPoint = Math.max(lastSentenceEnd, lastParagraphEnd);
        
        if (breakPoint > startIndex + this.chunkSize * 0.5) {
          chunkEnd = breakPoint + 1;
        }
      }

      const chunkText = text.substring(startIndex, chunkEnd).trim();
      
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          startIndex,
          endIndex: chunkEnd
        });
      }

      // Move start index with overlap
      startIndex = Math.max(chunkEnd - this.chunkOverlap, startIndex + 1);
    }

    return chunks;
  }

  async generateQueryEmbedding(query) {
    try {
      const aiService = getService('ai');
      return await aiService.generateEmbedding(query);
    } catch (error) {
      console.error('Query embedding generation error:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts) {
    try {
      const aiService = getService('ai');
      const embeddings = [];

      for (const text of texts) {
        try {
          const embedding = await aiService.generateEmbedding(text);
          embeddings.push(embedding);
        } catch (error) {
          console.error('Batch embedding error:', error);
          // Add zero vector as fallback
          embeddings.push(new Array(this.embeddingDimension).fill(0));
        }
      }

      return embeddings;
    } catch (error) {
      console.error('Batch embedding generation error:', error);
      throw error;
    }
  }

  calculateSimilarity(embedding1, embedding2) {
    try {
      if (embedding1.length !== embedding2.length) {
        throw new Error('Embedding dimensions must match');
      }

      // Calculate cosine similarity
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
      }

      const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      return similarity;
    } catch (error) {
      console.error('Similarity calculation error:', error);
      return 0;
    }
  }

  async findSimilarChunks(queryEmbedding, documentEmbeddings, limit = 5) {
    try {
      const similarities = documentEmbeddings.map(embedding => ({
        ...embedding,
        similarity: this.calculateSimilarity(queryEmbedding, embedding.vector)
      }));

      // Sort by similarity and return top results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Similar chunks search error:', error);
      return [];
    }
  }

  async updateDocumentEmbeddings(documentId, newText) {
    try {
      // This would typically update embeddings in the database
      // For now, we'll just log the action
      console.log(`Updating embeddings for document: ${documentId}`);
      
      // In a real implementation, you would:
      // 1. Generate new embeddings for the updated text
      // 2. Update the document in the database
      // 3. Update the search index
      
      return true;
    } catch (error) {
      console.error('Document embedding update error:', error);
      throw error;
    }
  }

  async deleteDocumentEmbeddings(documentId) {
    try {
      // This would typically remove embeddings from the database
      console.log(`Deleting embeddings for document: ${documentId}`);
      
      // In a real implementation, you would:
      // 1. Remove embeddings from the database
      // 2. Update the search index
      
      return true;
    } catch (error) {
      console.error('Document embedding deletion error:', error);
      throw error;
    }
  }

  getEmbeddingStats() {
    return {
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      embeddingDimension: this.embeddingDimension
    };
  }
}

export { EmbeddingService };

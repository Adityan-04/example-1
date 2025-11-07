import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';
import natural from 'natural';
import compromise from 'compromise';

class AIService {
  constructor() {
    this.openai = null;
    this.hf = null;
    this.models = {
      openai: {
        embedding: 'text-embedding-3-large',
        chat: 'gpt-4-turbo-preview',
        completion: 'gpt-3.5-turbo'
      },
      huggingface: {
        embedding: 'sentence-transformers/all-MiniLM-L6-v2',
        summarization: 'facebook/bart-large-cnn',
        ner: 'dbmdz/bert-large-cased-finetuned-conll03-english',
        sentiment: 'cardiffnlp/twitter-roberta-base-sentiment-latest'
      }
    };
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize OpenAI
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI initialized');
      }

      // Initialize Hugging Face
      if (process.env.HUGGINGFACE_API_KEY) {
        this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
        console.log('✅ Hugging Face initialized');
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize AI service:', error);
      throw error;
    }
  }

  // Text embedding generation
  async generateEmbedding(text, model = 'openai') {
    try {
      if (model === 'openai' && this.openai) {
        const response = await this.openai.embeddings.create({
          model: this.models.openai.embedding,
          input: text
        });
        return response.data[0].embedding;
      } else if (model === 'huggingface' && this.hf) {
        const response = await this.hf.featureExtraction({
          model: this.models.huggingface.embedding,
          inputs: text
        });
        return response;
      } else {
        throw new Error('No embedding model available');
      }
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  // Text summarization
  async summarizeText(text, maxLength = 150) {
    try {
      if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: this.models.openai.chat,
          messages: [
            {
              role: 'system',
              content: `Summarize the following text in ${maxLength} words or less. Focus on key points and main ideas.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: Math.min(maxLength * 2, 1000),
          temperature: 0.3
        });
        return response.choices[0].message.content;
      } else if (this.hf) {
        const response = await this.hf.summarization({
          model: this.models.huggingface.summarization,
          inputs: text,
          parameters: {
            max_length: maxLength,
            min_length: Math.floor(maxLength * 0.5)
          }
        });
        return response.summary_text;
      } else {
        // Fallback to extractive summarization
        return this.extractiveSummarization(text, maxLength);
      }
    } catch (error) {
      console.error('Error summarizing text:', error);
      return this.extractiveSummarization(text, maxLength);
    }
  }

  // Extractive summarization fallback
  extractiveSummarization(text, maxLength) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordCount = maxLength;
    
    // Simple scoring based on word frequency and position
    const wordFreq = {};
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const scoredSentences = sentences.map((sentence, index) => {
      const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
      const score = words.reduce((acc, word) => acc + (wordFreq[word] || 0), 0);
      const positionScore = 1 / (index + 1); // Favor earlier sentences
      return { sentence, score: score + positionScore };
    });

    scoredSentences.sort((a, b) => b.score - a.score);

    let summary = '';
    let currentLength = 0;
    
    for (const { sentence } of scoredSentences) {
      if (currentLength + sentence.length <= wordCount) {
        summary += sentence.trim() + '. ';
        currentLength += sentence.length;
      } else {
        break;
      }
    }

    return summary.trim();
  }

  // Named Entity Recognition
  async extractEntities(text) {
    try {
      if (this.hf) {
        const response = await this.hf.namedEntityRecognition({
          model: this.models.huggingface.ner,
          inputs: text
        });
        return response.map(entity => ({
          text: entity.word,
          type: entity.entity_group,
          confidence: entity.score,
          startIndex: entity.start,
          endIndex: entity.end
        }));
      } else {
        // Fallback to rule-based extraction
        return this.ruleBasedEntityExtraction(text);
      }
    } catch (error) {
      console.error('Error extracting entities:', error);
      return this.ruleBasedEntityExtraction(text);
    }
  }

  // Rule-based entity extraction fallback
  ruleBasedEntityExtraction(text) {
    const entities = [];
    
    // Email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'email',
        confidence: 0.9,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    // Phone numbers
    const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'phone',
        confidence: 0.8,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    // URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    while ((match = urlRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'url',
        confidence: 0.9,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    // Use compromise for more sophisticated entity extraction
    const doc = compromise(text);
    
    // People
    const people = doc.people().out('array');
    people.forEach(person => {
      const index = text.indexOf(person);
      if (index !== -1) {
        entities.push({
          text: person,
          type: 'person',
          confidence: 0.7,
          startIndex: index,
          endIndex: index + person.length
        });
      }
    });

    // Organizations
    const orgs = doc.organizations().out('array');
    orgs.forEach(org => {
      const index = text.indexOf(org);
      if (index !== -1) {
        entities.push({
          text: org,
          type: 'organization',
          confidence: 0.7,
          startIndex: index,
          endIndex: index + org.length
        });
      }
    });

    // Places
    const places = doc.places().out('array');
    places.forEach(place => {
      const index = text.indexOf(place);
      if (index !== -1) {
        entities.push({
          text: place,
          type: 'location',
          confidence: 0.6,
          startIndex: index,
          endIndex: index + place.length
        });
      }
    });

    return entities;
  }

  // Topic modeling
  async extractTopics(text) {
    try {
      // Simple keyword extraction and clustering
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
      
      const filteredWords = words.filter(word => 
        word.length > 3 && !stopWords.has(word)
      );

      const wordFreq = {};
      filteredWords.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      const sortedWords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20);

      return sortedWords.map(([word, freq]) => ({
        name: word,
        confidence: Math.min(freq / filteredWords.length, 1),
        keywords: [word],
        relatedTopics: []
      }));
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }

  // Sentiment analysis
  async analyzeSentiment(text) {
    try {
      if (this.hf) {
        const response = await this.hf.textClassification({
          model: this.models.huggingface.sentiment,
          inputs: text
        });
        return {
          label: response[0].label,
          confidence: response[0].score
        };
      } else {
        // Fallback to rule-based sentiment
        return this.ruleBasedSentiment(text);
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return this.ruleBasedSentiment(text);
    }
  }

  // Rule-based sentiment analysis fallback
  ruleBasedSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'best', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'dislike', 'poor', 'wrong', 'fail'];
    
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });
    
    const total = positiveScore + negativeScore;
    if (total === 0) return { label: 'neutral', confidence: 0.5 };
    
    const positiveRatio = positiveScore / total;
    if (positiveRatio > 0.6) return { label: 'positive', confidence: positiveRatio };
    if (positiveRatio < 0.4) return { label: 'negative', confidence: 1 - positiveRatio };
    return { label: 'neutral', confidence: 0.5 };
  }

  // Generate answer using RAG
  async generateAnswer(query, context, options = {}) {
    try {
      const {
        model = 'openai',
        temperature = 0.3,
        maxTokens = 1000,
        includeReasoning = true
      } = options;

      if (this.openai) {
        const systemPrompt = `You are DocuSage AI, an intelligent document analysis assistant. 
        Use the provided context to answer the user's question accurately and comprehensively.
        Always cite your sources and provide reasoning for your answers.
        If you cannot find relevant information in the context, say so clearly.
        
        Context: ${context}`;

        const response = await this.openai.chat.completions.create({
          model: this.models.openai.chat,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        });

        const answer = response.choices[0].message.content;
        
        // Extract reasoning if requested
        let reasoning = '';
        if (includeReasoning) {
          reasoning = `Based on the provided context, I analyzed the relevant information and synthesized this answer.`;
        }

        return {
          answer,
          reasoning,
          confidence: 0.8, // Could be improved with actual confidence scoring
          model: 'gpt-4-turbo-preview'
        };
      } else {
        throw new Error('No AI model available');
      }
    } catch (error) {
      console.error('Error generating answer:', error);
      throw error;
    }
  }

  // Generate follow-up questions
  async generateFollowUpQuestions(query, context) {
    try {
      if (this.openai) {
        const prompt = `Based on this query: "${query}" and context: "${context}", 
        generate 3-5 relevant follow-up questions that would help the user explore the topic further.`;

        const response = await this.openai.chat.completions.create({
          model: this.models.openai.chat,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.7
        });

        const questions = response.choices[0].message.content
          .split('\n')
          .filter(q => q.trim().length > 0)
          .map(q => q.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 5);

        return questions;
      } else {
        // Fallback to simple question generation
        return [
          `Can you tell me more about ${query}?`,
          `What are the key points related to ${query}?`,
          `How does ${query} relate to other topics?`
        ];
      }
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return [];
    }
  }
}

export { AIService };

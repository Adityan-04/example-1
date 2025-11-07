import { getService } from './index.js';

class KnowledgeGraphService {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🧠 Initializing knowledge graph service...');
      
      // Load existing knowledge graph from database
      await this.loadKnowledgeGraph();
      
      this.initialized = true;
      console.log('✅ Knowledge graph service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize knowledge graph service:', error);
      throw error;
    }
  }

  async loadKnowledgeGraph() {
    try {
      // In a real implementation, you would load from database
      // For now, we'll start with an empty graph
      console.log('Loading knowledge graph...');
    } catch (error) {
      console.error('Error loading knowledge graph:', error);
    }
  }

  async addDocument(document) {
    try {
      const documentNode = {
        id: `doc_${document._id}`,
        label: document.title,
        type: 'document',
        properties: {
          documentId: document._id,
          title: document.title,
          type: document.fileType,
          createdAt: document.createdAt,
          summary: document.summary,
          wordCount: document.metadata?.wordCount || 0,
          pageCount: document.metadata?.pageCount || 0
        },
        position: this.generateRandomPosition(),
        size: this.calculateNodeSize(document),
        color: this.getNodeColor('document')
      };

      this.nodes.set(documentNode.id, documentNode);

      // Add entity nodes
      if (document.entities && document.entities.length > 0) {
        for (const entity of document.entities) {
          await this.addEntity(entity, documentNode.id);
        }
      }

      // Add topic nodes
      if (document.topics && document.topics.length > 0) {
        for (const topic of document.topics) {
          await this.addTopic(topic, documentNode.id);
        }
      }

      return documentNode;
    } catch (error) {
      console.error('Error adding document to knowledge graph:', error);
      throw error;
    }
  }

  async addEntity(entity, documentId) {
    try {
      const entityId = `entity_${entity.text}_${entity.type}`;
      
      let entityNode = this.nodes.get(entityId);
      if (!entityNode) {
        entityNode = {
          id: entityId,
          label: entity.text,
          type: 'entity',
          properties: {
            text: entity.text,
            entityType: entity.type,
            confidence: entity.confidence,
            mentions: 1,
            documents: [documentId]
          },
          position: this.generateRandomPosition(),
          size: this.calculateEntitySize(entity),
          color: this.getNodeColor('entity')
        };
        this.nodes.set(entityId, entityNode);
      } else {
        // Update existing entity
        entityNode.properties.mentions += 1;
        if (!entityNode.properties.documents.includes(documentId)) {
          entityNode.properties.documents.push(documentId);
        }
        this.nodes.set(entityId, entityNode);
      }

      // Add edge between document and entity
      const edgeId = `edge_${documentId}_${entityId}`;
      const edge = {
        id: edgeId,
        source: documentId,
        target: entityId,
        type: 'mentions',
        weight: entity.confidence,
        properties: {
          confidence: entity.confidence,
          startIndex: entity.startIndex,
          endIndex: entity.endIndex
        }
      };
      this.edges.set(edgeId, edge);

      return entityNode;
    } catch (error) {
      console.error('Error adding entity to knowledge graph:', error);
      throw error;
    }
  }

  async addTopic(topic, documentId) {
    try {
      const topicId = `topic_${topic.name}`;
      
      let topicNode = this.nodes.get(topicId);
      if (!topicNode) {
        topicNode = {
          id: topicId,
          label: topic.name,
          type: 'topic',
          properties: {
            name: topic.name,
            confidence: topic.confidence,
            keywords: topic.keywords,
            relatedTopics: topic.relatedTopics,
            mentions: 1,
            documents: [documentId]
          },
          position: this.generateRandomPosition(),
          size: this.calculateTopicSize(topic),
          color: this.getNodeColor('topic')
        };
        this.nodes.set(topicId, topicNode);
      } else {
        // Update existing topic
        topicNode.properties.mentions += 1;
        if (!topicNode.properties.documents.includes(documentId)) {
          topicNode.properties.documents.push(documentId);
        }
        this.nodes.set(topicId, topicNode);
      }

      // Add edge between document and topic
      const edgeId = `edge_${documentId}_${topicId}`;
      const edge = {
        id: edgeId,
        source: documentId,
        target: topicId,
        type: 'contains',
        weight: topic.confidence,
        properties: {
          confidence: topic.confidence
        }
      };
      this.edges.set(edgeId, edge);

      // Add edges between related topics
      if (topic.relatedTopics && topic.relatedTopics.length > 0) {
        for (const relatedTopicName of topic.relatedTopics) {
          const relatedTopicId = `topic_${relatedTopicName}`;
          if (this.nodes.has(relatedTopicId)) {
            const relatedEdgeId = `edge_${topicId}_${relatedTopicId}`;
            const relatedEdge = {
              id: relatedEdgeId,
              source: topicId,
              target: relatedTopicId,
              type: 'related',
              weight: 0.5,
              properties: {
                relationship: 'related'
              }
            };
            this.edges.set(relatedEdgeId, relatedEdge);
          }
        }
      }

      return topicNode;
    } catch (error) {
      console.error('Error adding topic to knowledge graph:', error);
      throw error;
    }
  }

  async removeDocument(documentId) {
    try {
      const docNodeId = `doc_${documentId}`;
      
      // Remove document node
      this.nodes.delete(docNodeId);
      
      // Remove all edges connected to this document
      const edgesToRemove = [];
      for (const [edgeId, edge] of this.edges) {
        if (edge.source === docNodeId || edge.target === docNodeId) {
          edgesToRemove.push(edgeId);
        }
      }
      
      for (const edgeId of edgesToRemove) {
        this.edges.delete(edgeId);
      }

      // Update entity and topic nodes
      for (const [nodeId, node] of this.nodes) {
        if (node.properties.documents && node.properties.documents.includes(documentId)) {
          node.properties.documents = node.properties.documents.filter(id => id !== documentId);
          node.properties.mentions -= 1;
          
          if (node.properties.mentions <= 0) {
            this.nodes.delete(nodeId);
          } else {
            this.nodes.set(nodeId, node);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error removing document from knowledge graph:', error);
      throw error;
    }
  }

  async getKnowledgeGraph() {
    try {
      return {
        nodes: Array.from(this.nodes.values()),
        edges: Array.from(this.edges.values()),
        metadata: {
          totalNodes: this.nodes.size,
          totalEdges: this.edges.size,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Error getting knowledge graph:', error);
      throw error;
    }
  }

  async getNodeConnections(nodeId, depth = 1) {
    try {
      const connectedNodes = new Set();
      const connectedEdges = new Set();
      
      const traverse = (currentNodeId, currentDepth) => {
        if (currentDepth > depth) return;
        
        for (const [edgeId, edge] of this.edges) {
          if (edge.source === currentNodeId) {
            connectedNodes.add(edge.target);
            connectedEdges.add(edgeId);
            if (currentDepth < depth) {
              traverse(edge.target, currentDepth + 1);
            }
          } else if (edge.target === currentNodeId) {
            connectedNodes.add(edge.source);
            connectedEdges.add(edgeId);
            if (currentDepth < depth) {
              traverse(edge.source, currentDepth + 1);
            }
          }
        }
      };
      
      traverse(nodeId, 0);
      
      const nodes = Array.from(connectedNodes).map(id => this.nodes.get(id)).filter(Boolean);
      const edges = Array.from(connectedEdges).map(id => this.edges.get(id)).filter(Boolean);
      
      return { nodes, edges };
    } catch (error) {
      console.error('Error getting node connections:', error);
      throw error;
    }
  }

  async findSimilarNodes(nodeId, limit = 5) {
    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        throw new Error('Node not found');
      }

      const similarities = [];
      
      for (const [otherNodeId, otherNode] of this.nodes) {
        if (otherNodeId === nodeId) continue;
        
        const similarity = this.calculateNodeSimilarity(node, otherNode);
        if (similarity > 0.3) { // Threshold for similarity
          similarities.push({
            node: otherNode,
            similarity
          });
        }
      }
      
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding similar nodes:', error);
      throw error;
    }
  }

  calculateNodeSimilarity(node1, node2) {
    try {
      let similarity = 0;
      
      // Type similarity
      if (node1.type === node2.type) {
        similarity += 0.3;
      }
      
      // Label similarity (simple string comparison)
      const label1 = node1.label.toLowerCase();
      const label2 = node2.label.toLowerCase();
      if (label1.includes(label2) || label2.includes(label1)) {
        similarity += 0.4;
      }
      
      // Property similarity
      const props1 = node1.properties || {};
      const props2 = node2.properties || {};
      
      const commonKeys = Object.keys(props1).filter(key => props2.hasOwnProperty(key));
      if (commonKeys.length > 0) {
        similarity += 0.3 * (commonKeys.length / Math.max(Object.keys(props1).length, Object.keys(props2).length));
      }
      
      return Math.min(similarity, 1);
    } catch (error) {
      console.error('Error calculating node similarity:', error);
      return 0;
    }
  }

  generateRandomPosition() {
    return {
      x: (Math.random() - 0.5) * 1000,
      y: (Math.random() - 0.5) * 1000,
      z: (Math.random() - 0.5) * 1000
    };
  }

  calculateNodeSize(document) {
    const wordCount = document.metadata?.wordCount || 0;
    const baseSize = 20;
    const sizeMultiplier = Math.min(wordCount / 1000, 5); // Cap at 5x base size
    return baseSize + (sizeMultiplier * 10);
  }

  calculateEntitySize(entity) {
    const baseSize = 15;
    const confidenceMultiplier = entity.confidence || 0.5;
    return baseSize + (confidenceMultiplier * 10);
  }

  calculateTopicSize(topic) {
    const baseSize = 18;
    const confidenceMultiplier = topic.confidence || 0.5;
    return baseSize + (confidenceMultiplier * 8);
  }

  getNodeColor(type) {
    const colors = {
      document: '#8b5cf6',
      entity: '#06b6d4',
      topic: '#10b981',
      concept: '#f59e0b'
    };
    return colors[type] || '#6b7280';
  }

  async getGraphStats() {
    try {
      const nodesByType = {};
      const edgesByType = {};
      
      for (const node of this.nodes.values()) {
        nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      }
      
      for (const edge of this.edges.values()) {
        edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
      }
      
      return {
        totalNodes: this.nodes.size,
        totalEdges: this.edges.size,
        nodesByType,
        edgesByType,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting graph stats:', error);
      throw error;
    }
  }
}

export { KnowledgeGraphService };

import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from models.document import Document
import os
import json

class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embedding_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'embeddings')
        os.makedirs(self.embedding_dir, exist_ok=True)
    
    def generate_embeddings(self, document):
        """Generate and store embeddings for a document."""
        try:
            if not document.content:
                return {'error': 'Document content not available'}
            
            # Generate embeddings
            embeddings = self.model.encode(document.content)
            
            # Create embedding file path
            embedding_path = os.path.join(
                self.embedding_dir,
                f'doc_{document.id}_embeddings.npy'
            )
            
            # Save embeddings
            np.save(embedding_path, embeddings)
            
            # Update document with embedding path
            document.embedding_path = embedding_path
            
            return {'status': 'success', 'path': embedding_path}
            
        except Exception as e:
            return {'error': str(e)}
    
    def find_similar(self, document, limit=5):
        """Find similar documents based on embedding similarity."""
        try:
            if not document.embedding_path or not os.path.exists(document.embedding_path):
                return {'error': 'Document embeddings not available'}
            
            # Load query document embeddings
            query_embeddings = np.load(document.embedding_path)
            
            # Get all documents for the same user
            documents = Document.query.filter_by(user_id=document.user_id).all()
            
            # Collect all available embeddings
            doc_embeddings = []
            valid_docs = []
            
            for doc in documents:
                if doc.id != document.id and doc.embedding_path and \
                   os.path.exists(doc.embedding_path):
                    try:
                        emb = np.load(doc.embedding_path)
                        if len(emb.shape) > 1:
                            # If we have multiple embeddings per document, use mean
                            emb = np.mean(emb, axis=0)
                        doc_embeddings.append(emb)
                        valid_docs.append(doc)
                    except Exception:
                        continue
            
            if not doc_embeddings:
                return {'similar_documents': []}
            
            # Convert to numpy array
            doc_embeddings = np.array(doc_embeddings)
            
            # If query has multiple embeddings, use mean
            if len(query_embeddings.shape) > 1:
                query_embeddings = np.mean(query_embeddings, axis=0)
            
            # Create FAISS index
            dimension = query_embeddings.shape[0]
            index = faiss.IndexFlatL2(dimension)
            index.add(doc_embeddings)
            
            # Search for similar documents
            D, I = index.search(query_embeddings.reshape(1, -1), min(limit, len(valid_docs)))
            
            # Format results
            similar_docs = []
            for i, (idx, distance) in enumerate(zip(I[0], D[0])):
                if idx < len(valid_docs):
                    doc = valid_docs[idx]
                    similar_docs.append({
                        'document': doc.to_dict(),
                        'similarity_score': float(1 / (1 + distance))  # Convert distance to similarity score
                    })
            
            return {'similar_documents': similar_docs}
            
        except Exception as e:
            return {'error': str(e)}
    
    def batch_generate_embeddings(self, documents):
        """Generate embeddings for multiple documents in batch."""
        results = []
        for document in documents:
            result = self.generate_embeddings(document)
            results.append({
                'document_id': document.id,
                'status': 'success' if 'error' not in result else 'error',
                'details': result
            })
        return results
    
    def cleanup_embeddings(self, document_ids=None):
        """Clean up embedding files for deleted documents."""
        try:
            # Get list of all embedding files
            embedding_files = os.listdir(self.embedding_dir)
            
            # If specific document IDs provided, only clean those
            if document_ids:
                for doc_id in document_ids:
                    filename = f'doc_{doc_id}_embeddings.npy'
                    if filename in embedding_files:
                        os.remove(os.path.join(self.embedding_dir, filename))
            else:
                # Clean up all embeddings without matching documents
                for filename in embedding_files:
                    if filename.startswith('doc_') and filename.endswith('_embeddings.npy'):
                        doc_id = int(filename.split('_')[1])
                        if not Document.query.get(doc_id):
                            os.remove(os.path.join(self.embedding_dir, filename))
            
            return {'status': 'success'}
            
        except Exception as e:
            return {'error': str(e)}
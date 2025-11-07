import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from models.document import Document
from sqlalchemy import or_
from datetime import datetime, timedelta

class SearchService:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.index = None
        self.document_map = {}
        self.last_index_update = None
        self.index_update_interval = timedelta(minutes=5)
    
    def search(self, query, user_id, filters=None, page=1, per_page=10):
        """Search documents using semantic search and filters."""
        try:
            # Apply filters to base query
            base_query = Document.query.filter_by(user_id=user_id)
            if filters:
                base_query = self._apply_filters(base_query, filters)
            
            # Get total count for pagination
            total_docs = base_query.count()
            
            if total_docs == 0:
                return self._format_results([], total_docs, page, per_page)
            
            # Update index if needed
            self._ensure_index_updated(base_query)
            
            # Get semantic search results
            query_vector = self.model.encode([query])[0]
            D, I = self.index.search(np.array([query_vector]), total_docs)
            
            # Get document IDs from results
            doc_ids = [self.document_map[i] for i in I[0] if i in self.document_map]
            
            # Paginate results
            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            paginated_ids = doc_ids[start_idx:end_idx]
            
            # Fetch documents in order
            documents = []
            for doc_id in paginated_ids:
                doc = Document.query.get(doc_id)
                if doc:  # Ensure document still exists
                    documents.append(doc)
            
            return self._format_results(documents, total_docs, page, per_page)
            
        except Exception as e:
            return {'error': str(e)}
    
    def _ensure_index_updated(self, query):
        """Update the FAISS index if needed."""
        current_time = datetime.utcnow()
        if (not self.last_index_update or 
            current_time - self.last_index_update > self.index_update_interval):
            self._update_index(query)
    
    def _update_index(self, query):
        """Update the FAISS index with current documents."""
        documents = query.all()
        if not documents:
            return
        
        # Extract text content from documents
        texts = [doc.content for doc in documents if doc.content]
        if not texts:
            return
        
        # Create document mapping
        self.document_map = {i: doc.id for i, doc in enumerate(documents)}
        
        # Create and populate FAISS index
        embeddings = self.model.encode(texts)
        dimension = embeddings.shape[1]
        
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(np.array(embeddings))
        
        self.last_index_update = datetime.utcnow()
    
    def _apply_filters(self, query, filters):
        """Apply filters to the document query."""
        if 'file_type' in filters:
            query = query.filter(Document.file_type.in_(filters['file_type']))
            
        if 'date_range' in filters:
            start_date = datetime.fromisoformat(filters['date_range']['start'])
            end_date = datetime.fromisoformat(filters['date_range']['end'])
            query = query.filter(Document.created_at.between(start_date, end_date))
            
        if 'status' in filters:
            query = query.filter(Document.status.in_(filters['status']))
            
        if 'keyword' in filters:
            keyword = f'%{filters["keyword"]}%'
            query = query.filter(or_(
                Document.filename.ilike(keyword),
                Document.content.ilike(keyword)
            ))
        
        return query
    
    def _format_results(self, documents, total_count, page, per_page):
        """Format search results with pagination info."""
        return {
            'documents': [doc.to_dict() for doc in documents],
            'pagination': {
                'total': total_count,
                'pages': (total_count + per_page - 1) // per_page,
                'current_page': page,
                'per_page': per_page
            }
        }
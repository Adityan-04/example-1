from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models.document import Document
from services.ai_service import AIService
from services.search_service import SearchService
from app import db, limiter
from datetime import datetime
import json

agents_bp = Blueprint('agents', __name__)
ai_service = AIService()
search_service = SearchService()

@agents_bp.route('/agents/analyze', methods=['POST'])
@login_required
@limiter.limit('10 per minute')
def analyze_document():
    """Analyze a document using AI agents."""
    try:
        data = request.get_json()
        document_id = data.get('document_id')
        analysis_types = data.get('analysis_types', ['general'])
        
        if not document_id:
            return jsonify({'error': 'Document ID is required'}), 400
        
        # Check if document exists and belongs to user
        document = Document.query.filter_by(
            id=document_id,
            user_id=current_user.id
        ).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Perform analysis
        analysis_results = ai_service.analyze_document(
            document.content,
            analysis_types
        )
        
        # Update document metadata
        if not document.metadata:
            document.metadata = {}
        document.metadata['analysis'] = {
            **document.metadata.get('analysis', {}),
            **analysis_results,
            'last_analyzed': datetime.utcnow().isoformat()
        }
        
        db.session.commit()
        
        return jsonify(analysis_results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@agents_bp.route('/agents/extract', methods=['POST'])
@login_required
@limiter.limit('10 per minute')
def extract_information():
    """Extract specific information from a document using AI agents."""
    try:
        data = request.get_json()
        document_id = data.get('document_id')
        extraction_types = data.get('extraction_types', ['entities'])
        
        if not document_id:
            return jsonify({'error': 'Document ID is required'}), 400
        
        # Check if document exists and belongs to user
        document = Document.query.filter_by(
            id=document_id,
            user_id=current_user.id
        ).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Extract information
        extraction_results = ai_service.extract_information(
            document.content,
            extraction_types
        )
        
        # Update document metadata
        if not document.metadata:
            document.metadata = {}
        document.metadata['extraction'] = {
            **document.metadata.get('extraction', {}),
            **extraction_results,
            'last_extracted': datetime.utcnow().isoformat()
        }
        
        db.session.commit()
        
        return jsonify(extraction_results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@agents_bp.route('/agents/query', methods=['POST'])
@login_required
@limiter.limit('20 per minute')
def query_documents():
    """Query documents using natural language."""
    try:
        data = request.get_json()
        query = data.get('query')
        filters = data.get('filters')
        page = int(data.get('page', 1))
        per_page = int(data.get('per_page', 10))
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        # Search documents
        search_results = search_service.search(
            query,
            current_user.id,
            filters,
            page,
            per_page
        )
        
        # Update user's query count
        if not current_user.usage:
            current_user.usage = {}
        current_user.usage['queriesExecuted'] = \
            current_user.usage.get('queriesExecuted', 0) + 1
        
        db.session.commit()
        
        return jsonify(search_results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@agents_bp.route('/agents/similar', methods=['POST'])
@login_required
@limiter.limit('20 per minute')
def find_similar_documents():
    """Find documents similar to a given document."""
    try:
        data = request.get_json()
        document_id = data.get('document_id')
        limit = int(data.get('limit', 5))
        
        if not document_id:
            return jsonify({'error': 'Document ID is required'}), 400
        
        # Check if document exists and belongs to user
        document = Document.query.filter_by(
            id=document_id,
            user_id=current_user.id
        ).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Find similar documents
        similar_results = search_service.find_similar(
            document,
            limit
        )
        
        return jsonify(similar_results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@agents_bp.route('/agents/batch-analyze', methods=['POST'])
@login_required
@limiter.limit('5 per minute')
def batch_analyze_documents():
    """Analyze multiple documents in batch."""
    try:
        data = request.get_json()
        document_ids = data.get('document_ids', [])
        analysis_types = data.get('analysis_types', ['general'])
        
        if not document_ids:
            return jsonify({'error': 'Document IDs are required'}), 400
        
        # Get documents
        documents = Document.query.filter(
            Document.id.in_(document_ids),
            Document.user_id == current_user.id
        ).all()
        
        results = []
        for document in documents:
            try:
                # Perform analysis
                analysis_results = ai_service.analyze_document(
                    document.content,
                    analysis_types
                )
                
                # Update document metadata
                if not document.metadata:
                    document.metadata = {}
                document.metadata['analysis'] = {
                    **document.metadata.get('analysis', {}),
                    **analysis_results,
                    'last_analyzed': datetime.utcnow().isoformat()
                }
                
                results.append({
                    'document_id': document.id,
                    'status': 'success',
                    'results': analysis_results
                })
            except Exception as e:
                results.append({
                    'document_id': document.id,
                    'status': 'error',
                    'error': str(e)
                })
        
        db.session.commit()
        
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
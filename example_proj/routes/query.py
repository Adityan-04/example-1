from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.document import Document
from app import db, limiter
from services.search_service import SearchService
from services.ai_service import AIService
from services.embedding_service import EmbeddingService

query_bp = Blueprint('query', __name__)
search_service = SearchService()
ai_service = AIService()
embedding_service = EmbeddingService()

@query_bp.route('/search', methods=['POST'])
@login_required
@limiter.limit('60 per minute')
def search_documents():
    data = request.get_json()
    query = data.get('query')
    filters = data.get('filters', {})
    page = data.get('page', 1)
    per_page = data.get('per_page', 10)
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    try:
        results = search_service.search(
            query=query,
            user_id=current_user.id,
            filters=filters,
            page=page,
            per_page=per_page
        )
        
        current_user.usage['queriesExecuted'] += 1
        db.session.commit()
        
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@query_bp.route('/analyze', methods=['POST'])
@login_required
@limiter.limit('30 per minute')
def analyze_document():
    data = request.get_json()
    document_id = data.get('document_id')
    analysis_type = data.get('analysis_type', 'general')
    
    document = Document.query.get_or_404(document_id)
    if document.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        analysis = ai_service.analyze_document(
            document=document,
            analysis_type=analysis_type
        )
        return jsonify(analysis)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@query_bp.route('/similar', methods=['POST'])
@login_required
@limiter.limit('30 per minute')
def find_similar_documents():
    data = request.get_json()
    document_id = data.get('document_id')
    limit = data.get('limit', 5)
    
    document = Document.query.get_or_404(document_id)
    if document.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        similar_docs = embedding_service.find_similar(
            document=document,
            limit=limit
        )
        return jsonify(similar_docs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@query_bp.route('/extract', methods=['POST'])
@login_required
@limiter.limit('30 per minute')
def extract_information():
    data = request.get_json()
    document_id = data.get('document_id')
    extraction_type = data.get('extraction_type', 'entities')
    
    document = Document.query.get_or_404(document_id)
    if document.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        extracted_info = ai_service.extract_information(
            document=document,
            extraction_type=extraction_type
        )
        return jsonify(extracted_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
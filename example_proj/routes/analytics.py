from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models.document import Document
from models.user import User
from app import db, limiter
from datetime import datetime, timedelta
from sqlalchemy import func

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/usage/summary', methods=['GET'])
@login_required
@limiter.limit('30 per minute')
def get_usage_summary():
    """Get summary of user's usage statistics."""
    try:
        # Get document statistics
        doc_stats = db.session.query(
            func.count(Document.id).label('total_documents'),
            func.sum(Document.size).label('total_size'),
            func.count(Document.id).filter(Document.status == 'completed').label('processed_documents')
        ).filter(Document.user_id == current_user.id).first()
        
        # Calculate storage usage percentage
        storage_limit = current_user.subscription.get('storage_limit', 0)
        storage_used = doc_stats.total_size or 0
        storage_percentage = (storage_used / storage_limit * 100) if storage_limit > 0 else 0
        
        return jsonify({
            'documents': {
                'total': doc_stats.total_documents or 0,
                'processed': doc_stats.processed_documents or 0,
                'storage_used': storage_used,
                'storage_limit': storage_limit,
                'storage_percentage': storage_percentage
            },
            'queries': {
                'total': current_user.usage.get('queriesExecuted', 0),
                'limit': current_user.subscription.get('monthly_queries', 0)
            },
            'subscription': {
                'plan': current_user.subscription.get('plan', 'free'),
                'status': current_user.subscription.get('status', 'active'),
                'renewal_date': current_user.subscription.get('renewal_date')
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/documents/activity', methods=['GET'])
@login_required
@limiter.limit('30 per minute')
def get_document_activity():
    """Get document activity statistics over time."""
    try:
        # Get time range from query parameters
        days = int(request.args.get('days', 30))
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get daily document counts
        daily_counts = db.session.query(
            func.date(Document.created_at).label('date'),
            func.count(Document.id).label('count')
        ).filter(
            Document.user_id == current_user.id,
            Document.created_at.between(start_date, end_date)
        ).group_by(func.date(Document.created_at)).all()
        
        # Format results
        activity = [{
            'date': str(result.date),
            'count': result.count
        } for result in daily_counts]
        
        return jsonify(activity)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/documents/types', methods=['GET'])
@login_required
@limiter.limit('30 per minute')
def get_document_types():
    """Get distribution of document types."""
    try:
        type_counts = db.session.query(
            Document.file_type,
            func.count(Document.id).label('count')
        ).filter(
            Document.user_id == current_user.id
        ).group_by(Document.file_type).all()
        
        return jsonify([{
            'type': result.file_type,
            'count': result.count
        } for result in type_counts])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/documents/popular', methods=['GET'])
@login_required
@limiter.limit('30 per minute')
def get_popular_documents():
    """Get most viewed/downloaded documents."""
    try:
        limit = int(request.args.get('limit', 5))
        
        # Get documents sorted by views/downloads
        documents = Document.query.filter_by(user_id=current_user.id)\
            .order_by(Document.analytics['views'].desc())\
            .limit(limit).all()
        
        return jsonify([{
            **doc.to_dict(),
            'views': doc.analytics.get('views', 0),
            'downloads': doc.analytics.get('downloads', 0),
            'last_viewed': doc.analytics.get('last_viewed')
        } for doc in documents])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/system/health', methods=['GET'])
@login_required
@limiter.limit('30 per minute')
def get_system_health():
    """Get system health metrics for admin users."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        # Get overall system statistics
        total_users = User.query.count()
        total_documents = Document.query.count()
        processing_documents = Document.query.filter_by(status='processing').count()
        error_documents = Document.query.filter_by(status='error').count()
        
        # Get storage statistics
        total_storage = db.session.query(func.sum(Document.size)).scalar() or 0
        
        return jsonify({
            'users': {
                'total': total_users,
                'active_last_24h': User.query.filter(
                    User.last_active > datetime.utcnow() - timedelta(hours=24)
                ).count()
            },
            'documents': {
                'total': total_documents,
                'processing': processing_documents,
                'error': error_documents
            },
            'storage': {
                'total_bytes': total_storage,
                'total_gb': round(total_storage / (1024 * 1024 * 1024), 2)
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
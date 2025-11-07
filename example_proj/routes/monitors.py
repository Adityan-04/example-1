from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models.document import Document
from app import db, limiter
from datetime import datetime
import json

monitors_bp = Blueprint('monitors', __name__)

@monitors_bp.route('/monitors', methods=['GET'])
@login_required
@limiter.limit('30 per minute')
def get_monitors():
    """Get all monitors for the current user."""
    try:
        documents = Document.query.filter_by(user_id=current_user.id).all()
        monitors = []
        
        for doc in documents:
            if doc.monitors:
                for monitor in doc.monitors:
                    monitors.append({
                        'id': monitor.get('id'),
                        'document_id': doc.id,
                        'document_name': doc.filename,
                        'type': monitor.get('type'),
                        'conditions': monitor.get('conditions'),
                        'status': monitor.get('status'),
                        'last_checked': monitor.get('last_checked'),
                        'created_at': monitor.get('created_at')
                    })
        
        return jsonify(monitors)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitors_bp.route('/monitors', methods=['POST'])
@login_required
@limiter.limit('10 per minute')
def create_monitor():
    """Create a new monitor for a document."""
    try:
        data = request.get_json()
        document_id = data.get('document_id')
        monitor_type = data.get('type')
        conditions = data.get('conditions')
        
        if not all([document_id, monitor_type, conditions]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if document exists and belongs to user
        document = Document.query.filter_by(
            id=document_id,
            user_id=current_user.id
        ).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Validate monitor type
        valid_types = ['content_change', 'keyword_alert', 'similarity_threshold']
        if monitor_type not in valid_types:
            return jsonify({'error': 'Invalid monitor type'}), 400
        
        # Create new monitor
        new_monitor = {
            'id': str(len(document.monitors) + 1),
            'type': monitor_type,
            'conditions': conditions,
            'status': 'active',
            'last_checked': datetime.utcnow().isoformat(),
            'created_at': datetime.utcnow().isoformat(),
            'alerts': []
        }
        
        if not document.monitors:
            document.monitors = []
        document.monitors.append(new_monitor)
        
        db.session.commit()
        
        return jsonify(new_monitor), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitors_bp.route('/monitors/<monitor_id>', methods=['PUT'])
@login_required
@limiter.limit('10 per minute')
def update_monitor(monitor_id):
    """Update a monitor's conditions or status."""
    try:
        data = request.get_json()
        conditions = data.get('conditions')
        status = data.get('status')
        
        # Find document and monitor
        documents = Document.query.filter_by(user_id=current_user.id).all()
        document = None
        monitor = None
        
        for doc in documents:
            if doc.monitors:
                for m in doc.monitors:
                    if m['id'] == monitor_id:
                        document = doc
                        monitor = m
                        break
                if monitor:
                    break
        
        if not monitor:
            return jsonify({'error': 'Monitor not found'}), 404
        
        # Update monitor
        if conditions:
            monitor['conditions'] = conditions
        if status:
            monitor['status'] = status
        
        monitor['last_checked'] = datetime.utcnow().isoformat()
        
        db.session.commit()
        
        return jsonify(monitor)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitors_bp.route('/monitors/<monitor_id>', methods=['DELETE'])
@login_required
@limiter.limit('10 per minute')
def delete_monitor(monitor_id):
    """Delete a monitor."""
    try:
        # Find document and monitor
        documents = Document.query.filter_by(user_id=current_user.id).all()
        document = None
        
        for doc in documents:
            if doc.monitors:
                for m in doc.monitors:
                    if m['id'] == monitor_id:
                        document = doc
                        break
                if document:
                    break
        
        if not document:
            return jsonify({'error': 'Monitor not found'}), 404
        
        # Remove monitor
        document.monitors = [m for m in document.monitors if m['id'] != monitor_id]
        
        db.session.commit()
        
        return jsonify({'message': 'Monitor deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitors_bp.route('/monitors/<monitor_id>/alerts', methods=['GET'])
@login_required
@limiter.limit('30 per minute')
def get_monitor_alerts(monitor_id):
    """Get all alerts for a specific monitor."""
    try:
        # Find document and monitor
        documents = Document.query.filter_by(user_id=current_user.id).all()
        monitor = None
        
        for doc in documents:
            if doc.monitors:
                for m in doc.monitors:
                    if m['id'] == monitor_id:
                        monitor = m
                        break
                if monitor:
                    break
        
        if not monitor:
            return jsonify({'error': 'Monitor not found'}), 404
        
        return jsonify(monitor.get('alerts', []))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitors_bp.route('/monitors/check', methods=['POST'])
@login_required
@limiter.limit('5 per minute')
def check_monitors():
    """Manually trigger monitor checks for user's documents."""
    try:
        documents = Document.query.filter_by(user_id=current_user.id).all()
        results = []
        
        for doc in documents:
            if doc.monitors:
                for monitor in doc.monitors:
                    if monitor['status'] == 'active':
                        # Perform check based on monitor type
                        check_result = {
                            'monitor_id': monitor['id'],
                            'document_id': doc.id,
                            'type': monitor['type'],
                            'status': 'checked',
                            'timestamp': datetime.utcnow().isoformat()
                        }
                        
                        # Update last checked timestamp
                        monitor['last_checked'] = check_result['timestamp']
                        
                        results.append(check_result)
        
        db.session.commit()
        
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
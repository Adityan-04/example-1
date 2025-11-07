from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from models.document import Document
from app import db, limiter
import os

documents_bp = Blueprint('documents', __name__)

# Configure upload settings
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@documents_bp.route('/upload', methods=['POST'])
@login_required
@limiter.limit('20 per minute')
def upload_document():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
        
    if not current_user.can_upload_document(file.content_length):
        return jsonify({'error': 'Upload limit exceeded'}), 403
        
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    
    document = Document(
        filename=filename,
        file_path=file_path,
        file_type=file.filename.rsplit('.', 1)[1].lower(),
        size=os.path.getsize(file_path),
        user_id=current_user.id
    )
    
    db.session.add(document)
    current_user.usage['documentsUploaded'] += 1
    current_user.usage['storageUsed'] += document.size
    db.session.commit()
    
    return jsonify(document.to_dict()), 201

@documents_bp.route('/', methods=['GET'])
@login_required
def get_documents():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    documents = Document.query.filter_by(user_id=current_user.id)\
        .order_by(Document.created_at.desc())\
        .paginate(page=page, per_page=per_page)
    
    return jsonify({
        'documents': [doc.to_dict() for doc in documents.items],
        'total': documents.total,
        'pages': documents.pages,
        'current_page': documents.page
    })

@documents_bp.route('/<int:document_id>', methods=['GET'])
@login_required
def get_document(document_id):
    document = Document.query.get_or_404(document_id)
    
    if document.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    return jsonify(document.to_dict())

@documents_bp.route('/<int:document_id>', methods=['DELETE'])
@login_required
def delete_document(document_id):
    document = Document.query.get_or_404(document_id)
    
    if document.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        os.remove(document.file_path)
    except OSError:
        pass  # File might already be deleted
        
    current_user.usage['documentsUploaded'] -= 1
    current_user.usage['storageUsed'] -= document.size
    
    db.session.delete(document)
    db.session.commit()
    
    return jsonify({'message': 'Document deleted successfully'})
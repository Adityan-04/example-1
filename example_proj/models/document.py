from app import db
from datetime import datetime

class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    file_type = db.Column(db.String(10), nullable=False)
    size = db.Column(db.Integer, nullable=False)  # Size in bytes
    
    # Processing status
    status = db.Column(db.String(20), default='pending')  # pending, processing, completed, error
    error_message = db.Column(db.Text)
    
    # Document metadata
    metadata = db.Column(db.JSON, default={
        'title': None,
        'author': None,
        'created_date': None,
        'modified_date': None,
        'page_count': None,
        'word_count': None,
        'language': None,
        'keywords': [],
        'summary': None
    })
    
    # Extracted content
    content = db.Column(db.Text)  # Raw text content
    embedding_path = db.Column(db.String(512))  # Path to stored embeddings
    
    # Analytics
    analytics = db.Column(db.JSON, default={
        'views': 0,
        'downloads': 0,
        'last_viewed': None,
        'last_downloaded': None
    })
    
    # Relationships
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('documents', lazy=True))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, filename, file_path, file_type, size, user_id):
        self.filename = filename
        self.file_path = file_path
        self.file_type = file_type
        self.size = size
        self.user_id = user_id
    
    def update_analytics(self, action):
        if action == 'view':
            self.analytics['views'] += 1
            self.analytics['last_viewed'] = datetime.utcnow().isoformat()
        elif action == 'download':
            self.analytics['downloads'] += 1
            self.analytics['last_downloaded'] = datetime.utcnow().isoformat()
        db.session.commit()
    
    def update_metadata(self, metadata):
        self.metadata.update(metadata)
        db.session.commit()
    
    def update_status(self, status, error_message=None):
        self.status = status
        if error_message:
            self.error_message = error_message
        db.session.commit()
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'file_type': self.file_type,
            'size': self.size,
            'status': self.status,
            'metadata': self.metadata,
            'analytics': self.analytics,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'user_id': self.user_id
        }
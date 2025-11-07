from flask_login import UserMixin
from datetime import datetime
from app import db, bcrypt

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    avatar = db.Column(db.String(200))
    role = db.Column(db.String(20), default='user')
    
    # Preferences
    preferences = db.Column(db.JSON, default={
        'theme': 'auto',
        'language': 'en',
        'notifications': {
            'email': True,
            'push': True,
            'webhook': False
        }
    })
    
    # Subscription
    subscription = db.Column(db.JSON, default={
        'plan': 'free',
        'startDate': None,
        'endDate': None,
        'isActive': True
    })
    
    # Usage statistics
    usage = db.Column(db.JSON, default={
        'documentsUploaded': 0,
        'queriesExecuted': 0,
        'storageUsed': 0,
        'lastActive': None
    })
    
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, email, password, name):
        self.email = email
        self.password = bcrypt.generate_password_hash(password).decode('utf-8')
        self.name = name
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)
    
    def update_last_active(self):
        self.usage['lastActive'] = datetime.utcnow().isoformat()
        db.session.commit()
    
    def can_upload_document(self, file_size):
        limits = {
            'free': {'maxDocuments': 10, 'maxFileSize': 10 * 1024 * 1024},  # 10MB
            'pro': {'maxDocuments': 100, 'maxFileSize': 100 * 1024 * 1024},  # 100MB
            'enterprise': {'maxDocuments': -1, 'maxFileSize': 500 * 1024 * 1024}  # 500MB
        }
        
        plan_limits = limits[self.subscription['plan']]
        can_upload_size = plan_limits['maxFileSize'] == -1 or file_size <= plan_limits['maxFileSize']
        can_upload_count = plan_limits['maxDocuments'] == -1 or self.usage['documentsUploaded'] < plan_limits['maxDocuments']
        
        return can_upload_size and can_upload_count
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'avatar': self.avatar,
            'role': self.role,
            'preferences': self.preferences,
            'subscription': self.subscription,
            'usage': self.usage,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
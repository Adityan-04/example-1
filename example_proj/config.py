import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration."""
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key')
    FLASK_APP = os.getenv('FLASK_APP', 'app.py')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///dee.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-jwt-secret')
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
    JWT_REFRESH_TOKEN_EXPIRES = 2592000  # 30 days
    
    # File Upload
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx', 'csv', 'xls', 'xlsx'}
    
    # Rate Limiting
    RATELIMIT_DEFAULT = "200 per day"
    RATELIMIT_STORAGE_URL = os.getenv('REDIS_URL', 'memory://')
    
    # MongoDB (for document storage)
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/dee')
    
    # Redis (for caching and session storage)
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # AI Services
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')
    
    # Email Configuration
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')
    
    # Subscription Plans
    SUBSCRIPTION_PLANS = {
        'free': {
            'storage_limit': 100 * 1024 * 1024,  # 100MB
            'monthly_queries': 100,
            'team_limit': 1,
            'features': ['basic_search', 'document_upload']
        },
        'pro': {
            'storage_limit': 1024 * 1024 * 1024,  # 1GB
            'monthly_queries': 1000,
            'team_limit': 5,
            'features': ['advanced_search', 'document_upload', 'analytics', 'api_access']
        },
        'enterprise': {
            'storage_limit': 10 * 1024 * 1024 * 1024,  # 10GB
            'monthly_queries': 10000,
            'team_limit': 20,
            'features': ['advanced_search', 'document_upload', 'analytics', 'api_access',
                        'priority_support', 'custom_models']
        }
    }

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False

class TestingConfig(Config):
    """Testing configuration."""
    DEBUG = False
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False
    
    # Use secure cookies
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    
    # Enable HTTPS
    PREFERRED_URL_SCHEME = 'https'
    
    # Stricter rate limits
    RATELIMIT_DEFAULT = "100 per day"

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get the current configuration based on environment."""
    config_name = os.getenv('FLASK_ENV', 'development')
    return config.get(config_name, DevelopmentConfig)
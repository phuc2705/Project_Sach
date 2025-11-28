import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # SQL Server Configuration
    DB_SERVER = os.getenv('DB_SERVER', 'localhost')
    DB_NAME = os.getenv('DB_NAME', 'BookStoreDB')
    DB_USER = os.getenv('DB_USER', 'sa')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'your_password')
    
    # Connection String
    @staticmethod
    def get_connection_string():
        return (
            f'DRIVER={{SQL Server}};'
            f'SERVER={Config.DB_SERVER};'
            f'DATABASE={Config.DB_NAME};'
            f'UID={Config.DB_USER};'
            f'PWD={Config.DB_PASSWORD};'
            f'Trusted_Connection=no;'
        )
    
    # JWT Configuration
    JWT_EXPIRATION_HOURS = 24
    
    # File Upload
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    
    # CORS
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:5500']

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Override with stronger secret key in production
    SECRET_KEY = os.getenv('SECRET_KEY')
    
    # Production database settings
    DB_SERVER = os.getenv('DB_SERVER')
    DB_NAME = os.getenv('DB_NAME')
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    DB_NAME = 'BookStoreDB_Test'

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
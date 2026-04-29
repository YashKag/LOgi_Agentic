import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    FLASK_APP = os.getenv('FLASK_APP', 'app.py')

    # Application settings
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = True


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    ENV = 'development'


class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = False
    TESTING = True
    ENV = 'testing'


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    ENV = 'production'

    # Override secret key in production
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable must be set in production")


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config(env=None):
    """Get configuration based on environment"""
    if env is None:
        env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])

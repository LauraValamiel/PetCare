import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

class Config:

    basedir = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER = os.path.join(basedir, 'uploads')
    
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
    
    mail_use_ssl_str = os.environ.get('MAIL_USE_SSL')
    mail_use_tls_str = os.environ.get('MAIL_USE_TLS')

    if mail_use_ssl_str:
        MAIL_USE_SSL = mail_use_ssl_str.lower() in ['true', 'on', '1']
        MAIL_USE_TLS = False
    elif mail_use_tls_str:
        MAIL_USE_TLS = mail_use_tls_str.lower() in ['true', 'on', '1']
        MAIL_USE_SSL = False
    else:
        MAIL_USE_TLS = True
        MAIL_USE_SSL = False
from flask import Flask
from flask_cors import CORS
import os
import locale
from app.config import Config
from app.extensions import mail

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins":"http://localhost:5173", "methods": ["GET", "POST", "PUT", "DELETE"], "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]}})
    mail.init_app(app)
    
    try:
        locale.setlocale(locale.LC_TIME, 'pt_BR.utf8')
    except:
        print("Aviso: Locale pt_BR.utf8 não encontrado, usando padrão.")

    from app.routes.auth import auth_bp
    from app.routes.tutores import tutores_bp
    from app.routes.pets import pets_bp
    from app.routes.saude import saude_bp
    from app.routes.servicos import servicos_bp
    from app.routes.uploads import uploads_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(tutores_bp)
    app.register_blueprint(pets_bp)
    app.register_blueprint(saude_bp)
    app.register_blueprint(servicos_bp)
    app.register_blueprint(uploads_bp)
    
    return app
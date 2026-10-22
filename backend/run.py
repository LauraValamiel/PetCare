import os

from app import create_app

app = create_app()

if __name__ == '__main__':
    # Em producao a aplicacao e servida pelo gunicorn (ver Dockerfile).
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() in ['true', 'on', '1']
    app.run(host='0.0.0.0', port=port, debug=debug)

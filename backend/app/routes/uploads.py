from flask import Blueprint, send_from_directory, jsonify, current_app

uploads_bp = Blueprint('uploads', __name__)

@uploads_bp.route('/api/uploads/<string:filename>', methods=['GET'])
def get_uploaded_file(filename):
    try:
        return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
    except FileNotFoundError:
        return jsonify({"error": "Arquivo não encontrado."}), 404

@uploads_bp.route('/api/uploads/string:<filename>/download', methods=['GET'])
def download_arquivo(filename):
    try:
        return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "Arquivo nao encontrado."}), 404
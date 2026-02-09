from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import bcrypt
from app.database import consultar_db, executar_db
from app.utils import allowed_file

tutores_bp = Blueprint('tutores', __name__)

@tutores_bp.route('/api/novo-tutor', methods=['POST'])
def criar_tutor():
    dados = request.json
    nome_completo = dados.get('nome_completo')
    celular = dados.get('celular')
    email = dados.get('email')
    cpf = dados.get('cpf')
    data_nascimento = dados.get('data_nascimento')
    genero_tutor = dados.get('genero_tutor')
    senha = dados.get('senha')
    foto_perfil_tutor = dados.get('foto_perfil_tutor')
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not all([nome_completo, email, senha]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400
    
    senha_hash = bcrypt.hashpw(senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    query = "INSERT INTO tutores (nome_completo, celular, email, cpf, data_nascimento, genero_tutor, senha, foto_perfil_tutor, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) " \
    "        RETURNING id_tutor"
    _, error = executar_db(query, (nome_completo, celular, email, cpf, data_nascimento, genero_tutor, senha_hash, foto_perfil_tutor, created_at))

    if error:
        return jsonify({"error": f"Erro ao criar tutor: {error}"}), 500
    
    return jsonify({"message": "Tutor criado com sucesso."}), 201


@tutores_bp.route('/api/tutores/<int:id_tutor>', methods=['PUT'])
def atualizar_tutor(id_tutor):
    dados = request.json
    nome_completo = dados.get('nome_completo')
    celular = dados.get('celular')
    email = dados.get('email')
    cpf = dados.get('cpf')
    data_nascimento = dados.get('data_nascimento')
    genero_tutor = dados.get('genero_tutor')
    senha = dados.get('senha')
    foto_perfil_tutor = dados.get('foto_perfil_tutor')
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    query = "UPDATE tutores " \
    "        SET nome_completo = %s, celular = %s, email = %s, cpf = %s, data_nascimento = %s, foto_perfil_tutor = %s" \
    "        WHERE id_tutor = %s"
    _, error = executar_db(query, (nome_completo, celular, email, cpf, data_nascimento, foto_perfil_tutor, id_tutor))
    if error:
        return jsonify({"error": f"Erro ao atualizar tutor: {error}"}), 500
    return jsonify({"message": "Tutor atualizado com sucesso."}), 200


@tutores_bp.route('/api/tutores/<int:id_tutor>/atualizar-foto', methods=['PUT'])
def atualizar_foto_tutor(id_tutor):
    if 'foto_perfil_nova' not in request.files:
        return jsonify({"error": "Nenhuma foto enviada."}), 400
    file = request.files['foto_perfil_nova']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"error": "Arquivo inválido ou não permitido."}), 400

    filename = secure_filename(file.filename)
    unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
    
    file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename))

    query = "UPDATE tutores SET foto_perfil_tutor = %s WHERE id_tutor = %s"
    _, error = executar_db(query, (unique_filename, id_tutor))
    if error:
        return jsonify({"error": f"Erro ao salvar o nome da foto no banco: {error}"}), 500
    return jsonify({"message": "Foto atualizada.", "foto_perfil_tutor": unique_filename}), 200


@tutores_bp.route('/api/tutores', methods=['GET'])
def listar_tutores():
    query = "SELECT * " \
    "        FROM tutores"
    tutor_list = consultar_db(query)

    if tutor_list:
        for tutor in tutor_list:
            if 'data_nascimento' in tutor and tutor['data_nascimento']:
                tutor['data_nascimento'] = tutor['data_nascimento'].isoformat()
        return jsonify(tutor_list), 200
    return jsonify({"error": "Tutor nao encontrado."}), 404


@tutores_bp.route('/api/tutores/<int:id_tutor>', methods=['GET'])
def tutor_por_id(id_tutor):
    query = "SELECT * " \
    "        FROM tutores " \
    "        WHERE id_tutor = %s"
    tutor = consultar_db(query, (id_tutor, ), one=False)
    
    if tutor:
        return jsonify(tutor if tutor else []), 200
    return jsonify({"error": "Tutor nao encontrado."}), 404
    

@tutores_bp.route('/api/tutores/<int:id_tutor>/pets/<int:id_pet>/desassociar', methods=['DELETE'])
def desassociar_pet(id_tutor, id_pet):
        query = "DELETE FROM tutor_pet" \
        "        WHERE id_tutor = %s AND id_pet = %s"
        _, error = executar_db(query, (id_tutor, id_pet))
        
        if error:
            return jsonify({"error": f"Erro ao deassociar tutor de pet: {error}"}), 500
        return jsonify({"message": "Tutor desassociado de pet com sucesso."}), 200


@tutores_bp.route('/api/tutores/<int:id_tutor>/tutores-e-pets', methods=['GET'])
def tutor_e_pets(id_tutor):
    query_tutor = """SELECT *
               FROM tutores
               WHERE id_tutor = %s"""
    tutor = consultar_db(query_tutor, (id_tutor,), one=True)
    if not tutor:
        return jsonify({"error": "Tutor não encontrado"}), 404

    if 'data_nascimento' in tutor and tutor['data_nascimento']:
        tutor['data_nascimento'] = tutor['data_nascimento'].isoformat()
    
    query_pet = """SELECT p.*
                   FROM pets p
                   JOIN tutor_pet tp ON p.id_pet = tp.id_pet
                   WHERE tp.id_tutor = %s"""
    
    pets = consultar_db(query_pet, (id_tutor, ), one=False)

    tutor['pets'] = pets if pets else []
    return jsonify(tutor), 200

@tutores_bp.route('/api/tutores/<int:id_tutor>/despesas', methods=['GET'])
def relatorio_despesas(id_tutor):
    query = """SELECT p.nome_pet, 
                      SUM(v.preco_vacina) AS total_vacinas,
                      SUM(c.preco_consulta) AS total_consultas,
                      SUM(r.preco_remedio) AS total_remedios,
                      SUM(pr.preco_compra) AS total_produtos,
                      (SUM(v.preco_vacina) + SUM(c.preco_consulta) + SUM(r.preco_remedio) + SUM(pr.preco_compra)) AS total_geral
               FROM pets p
               LEFT JOIN tutor_pet tp ON p.id_pet = tp.id_pet
               LEFT JOIN vacinas v ON p.id_pet = v.id_pet
               LEFT JOIN consultas c ON p.id_pet = c.id_pet
               LEFT JOIN remedios r ON p.id_pet = r.id_pet
               LEFT JOIN produtos pr ON p.id_pet = pr.id_pet
               WHERE tp.id_tutor = %s
               GROUP BY p.nome_pet"""
    
    despesas = consultar_db(query, (id_tutor,))
    return jsonify(despesas), 200

@tutores_bp.route('/api/tutores/<int:id_tutor>', methods=['DELETE'])
def excluir_tutor(id_tutor):
    query_check = "SELECT id_tutor FROM tutores WHERE id_tutor = %s"
    tutor = consultar_db(query_check, (id_tutor,), one=True)
    
    if not tutor:
        return jsonify({"error": "Tutor não encontrado."}), 404

    query_delete = "DELETE FROM tutores WHERE id_tutor = %s"
    _, error = executar_db(query_delete, (id_tutor,))

    if error:
        return jsonify({"error": f"Erro ao excluir do banco: {error}"}), 500

    return jsonify({"message": "Conta excluída com sucesso."}), 200

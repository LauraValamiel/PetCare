from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import secrets
import bcrypt
from flask_mail import Message
from app.database import consultar_db, executar_db
from app.extensions import mail
from app.utils import allowed_file

pets_bp = Blueprint('pets', __name__)

@pets_bp.route('/api/tutores/<int:id_tutor>/pets/novo-pet', methods=['POST'])
def criar_pet(id_tutor):
    dados = request.form
    nome_pet = dados.get('nome_pet')
    especie = dados.get('especie')
    raca = dados.get('raca')
    genero = dados.get('genero')
    data_nascimento = dados.get('data_nascimento')
    peso = dados.get('peso')
    idade = dados.get('idade')
    castrado_str = dados.get('castrado')

    obrigatorios = [nome_pet, especie, raca, genero, data_nascimento, peso, idade, castrado_str]

    if any( campo is None for campo in obrigatorios):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400
    
    foto_perfil_filename = None
    if 'foto_perfil' in request.files:
        file = request.files['foto_perfil']
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"

            file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename))
            foto_perfil_filename = unique_filename

    query_pet = """INSERT INTO pets (nome_pet, especie, raca, genero, data_nascimento, peso, foto_perfil, idade, castrado) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_pet"""
    
    castrado_bool = castrado_str.lower() == 'true' if isinstance(castrado_str, str) else None

    id_pet_criado, error = executar_db(query_pet, (nome_pet, especie, raca, genero, data_nascimento, peso, foto_perfil_filename, idade, castrado_bool), return_id=True)

    if error:
        return jsonify({"error": f"Erro ao criar pet: {error}"}), 500
    
    query_tutor_pet = "INSERT INTO tutor_pet (id_tutor, id_pet) " \
    "                  VALUES (%s, %s)"
    _, error_assoc = executar_db(query_tutor_pet, (id_tutor, id_pet_criado))

    if error_assoc:
        return jsonify({"error": f"Erro ao associar pet ao tutor: {error_assoc}"}), 500 
    
    return jsonify({"message": "Pet criado e associado ao tutor com sucesso."}), 201


@pets_bp.route('/api/tutores/<int:id_tutor>/pets/<int:id_pet>/atualizar-pet', methods=['PUT'])
def atualizar_pet(id_pet, id_tutor):
        dados = request.form
        nome_pet = dados.get('nome_pet')
        especie = dados.get('especie')
        raca = dados.get('raca')
        genero = dados.get('genero')
        data_nascimento = dados.get('data_nascimento')
        peso = dados.get('peso')
        idade = dados.get('idade')
        castrado_str = dados.get('castrado')

        foto_perfil_original = dados.get('foto_perfil_original')
        foto_perfil_filename = foto_perfil_original

        if 'foto_perfil_nova' in request.files:
            file = request.files['foto_perfil_nova']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename))
                foto_perfil_filename = unique_filename

        query = """UPDATE pets 
                   SET nome_pet = %s, especie = %s, raca = %s, genero = %s, data_nascimento = %s, peso = %s, foto_perfil = %s, idade = %s, castrado = %s 
                   WHERE id_pet = %s AND EXISTS (SELECT 1 FROM tutor_pet tp WHERE tp.id_pet = pets.id_pet AND tp.id_tutor = %s)"""
        
        castrado_bool = castrado_str.lower() == 'true' if isinstance(castrado_str, str) else bool(castrado_str)
 
        _, error = executar_db(query, (nome_pet, especie, raca, genero, data_nascimento, peso, foto_perfil_filename, idade, castrado_bool, id_pet, id_tutor))

        if error:
            return jsonify({"error": f"Erro ao atualizar pet: {error}"}), 500
        return jsonify({"message": "Pet atualizado com sucesso."}), 200


@pets_bp.route('/api/tutores/<int:id_tutor>/pets/<int:id_pet>/deletar-pet', methods=['DELETE'])
def deletar_pet(id_pet, id_tutor):
    query = """DELETE FROM pets  
                USING tutor_pet tp
                WHERE pets.id_pet = tp.id_pet AND pets.id_pet = %s AND tp.id_tutor = %s"""
    _, error = executar_db(query, (id_pet, id_tutor))
        
    if error:
            return jsonify({"error": f"Erro ao deletar pet: {error}"}), 500
    return jsonify({"message": "Pet deletado com sucesso."}), 200

@pets_bp.route('/api/tutores/<int:id_tutor>/pets/<int:id_pet>/convidar-tutor', methods=['POST'])
def convidar_tutor_para_pet(id_tutor, id_pet):
    dados = request.json
    email_tutor_convidado = dados.get('email')

    print(f"--- INICIANDO CONVITE PARA: {email_tutor_convidado} ---")

    if not email_tutor_convidado or not id_tutor:
        return jsonify({"error": "Email do tutor convidado e ID do tutor remetente sao obrigatorios."}), 400

    tutor_remetente = consultar_db("SELECT * FROM tutores WHERE id_tutor = %s", (id_tutor,), one=True)
    if not tutor_remetente:
        return jsonify({"error": "Tutor remetente não encontrado."}), 404
    
    pet = consultar_db("SELECT * FROM pets WHERE id_pet = %s", (id_pet,), one=True)
    if not pet:
        return jsonify({"error": "Pet nao encontrado."}), 404

    tutor_convidado = consultar_db("SELECT * FROM tutores WHERE email = %s", (email_tutor_convidado,), one=True)

    is_novo_usuario = False
    senha_temporaria = None
    id_tutor_convidado = None

    if not tutor_convidado:
        print("--- USUARIO NAO ENCONTRADO. CRIANDO NOVA CONTA... ---")
        is_novo_usuario = True
        senha_temporaria = secrets.token_hex(4)
        senha_hash = bcrypt.hashpw(senha_temporaria.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        nome_provisorio = email_tutor_convidado.split('@')[0]

        query_novo = "INSERT INTO tutores (nome_completo, email, senha, created_at) VALUES (%s, %s, %s, %s) RETURNING id_tutor"
        new_id, error = executar_db(query_novo, (nome_provisorio, email_tutor_convidado, senha_hash, created_at), return_id=True)

        if error:
            print(f"Erro ao criar tutor convidado: {error}")
            return jsonify({"error": "Erro ao criar conta para o convidado."}), 500
        
        id_tutor_convidado = new_id
        print(f"--- USUARIO CRIADO COM SUCESSO. ID: {id_tutor_convidado} ---")

    else:
        print(f"--- USUARIO JA EXISTE. ID: {tutor_convidado['id_tutor']} ---")
        id_tutor_convidado = tutor_convidado['id_tutor']
    
    query_assoc = "INSERT INTO tutor_pet (id_tutor, id_pet, nivel_permissao_1) VALUES (%s, %s, %s)"
    _, error = executar_db(query_assoc, (id_tutor_convidado, id_pet, 'convidado'))

    if error:
        if 'unique constraint' in error or 'duplicate key' in error:
            return jsonify({"error": "Este tutor já está associado a este pet."}), 400
        return jsonify({"error": f"Erro ao associar tutor ao pet: {error}"}), 500
    
    try:
        nome_pet = pet['nome_pet']
        nome_remetente = tutor_remetente['nome_completo']
        link_app = "http://localhost:5173/login"

        assunto = f"Convite para cuidar de {nome_pet} no PetCare"

        if is_novo_usuario:
            print(f"--- ENVIANDO EMAIL DE BOAS VINDAS COM SENHA ---")
            html_content = f"""
                <p>Olá,<p/>
                <p><strong>{nome_remetente}</strong> convidou você para ajudar a gerenciar o perfil de <strong>{nome_pet}</strong> no PetCare.</p>
                <p>Como você ainda não tinha cadastro, criamos uma conta automática para você:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Login:</strong> {email_tutor_convidado}</p>
                    <p><strong>Senha Temporária:</strong> {senha_temporaria}</p>
                </div>
                <p>Acesse o sistema e altere sua senha em "Meu Perfil".</p>
                <p><a href="{link_app}" style="padding: 10px 15px; background-color: #4285F4; color: white; text-decoration: none; border-radius: 5px;">Acessar PetCare</a></p>
                """
        else:
            html_content = f"""
                <p>Olá,</p>
                <p><strong>{nome_remetente}</strong> convidou você para ajudar a gerenciar o perfil de <strong>{nome_pet}</strong> no PetCare.</p>
                <p>O pet já foi adicionado à sua conta existente.</p>
                <p><a href="{link_app}">Clique aqui para acessar</a></p>
            """

        msg = Message(assunto, sender=current_app.config['MAIL_DEFAULT_SENDER'], recipients=[email_tutor_convidado])
        msg.html = html_content

        mail.send(msg)
        print("--- EMAIL ENVIADO COM SUCESSO ---")
    
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return jsonify({"message": "Tutor associado, mas houve erro ao enviar o email."}), 201
    
    return jsonify({"message": "Convite enviado com sucesso!"}), 201


@pets_bp.route('/api/tutores/<int:id_tutor>/pets', methods=['GET'])
def get_pets_por_tutor(id_tutor):
    query = """SELECT p.* 
                FROM pets p
                JOIN tutor_pet tp ON p.id_pet = tp.id_pet
                WHERE tp.id_tutor = %s"""
    
    pets = consultar_db(query, (id_tutor,), one=False)

    for pet in pets:
        if 'data_nascimento' in pet and pet['data_nascimento']:
            pet['data_nascimento'] = pet['data_nascimento'].isoformat()

    return jsonify(pets), 200

@pets_bp.route('/api/tutores/<int:id_tutor>/pets/<int:id_pet>', methods=['GET'])
def pets_por_id(id_pet, id_tutor):
    query = """SELECT p.* 
                FROM pets p
                JOIN tutor_pet tp ON p.id_pet = tp.id_pet
                WHERE p.id_pet = %s AND tp.id_tutor = %s"""
    pet = consultar_db(query, (id_pet, id_tutor), one=False)
    if pet:
        for p in pet:
            if 'data_nascimento' in p and p['data_nascimento']:
                p['data_nascimento'] = p['data_nascimento'].isoformat()
        return jsonify(pet), 200
    return jsonify({"error": "Pet não encontrado."}), 404

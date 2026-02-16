from flask import Blueprint, request, jsonify, current_app
from app.database import consultar_db, executar_db
from app.extensions import mail
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from flask_mail import Message
import bcrypt
import secrets
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/status')
def status():
    return jsonify({"status": "API is running"}), 200

@auth_bp.route('/api/login', methods=['POST'])
def login():
    dados = request.get_json(force=True)
    email = dados.get('email')
    senha = dados.get('senha')

    if not email or not senha:
        return jsonify({"error": "Email e senha sao obrigatorios."}), 400

    query = "SELECT * " \
    "        FROM tutores " \
    "        WHERE email = %s"
    tutor = consultar_db(query, (email,), one=True)

    if tutor and 'senha' in tutor and tutor['senha'] is not None:
        senha_hash_salva = tutor['senha']
        
        if isinstance(senha_hash_salva, str):
            senha_hash_salva = senha_hash_salva.encode('utf-8')
            
        senha_fornecida = senha.encode('utf-8')

        try:
            if bcrypt.checkpw(senha_fornecida, senha_hash_salva):
                query_pets = """SELECT p.* FROM pets p
                                JOIN tutor_pet tp ON p.id_pet = tp.id_pet
                                WHERE tp.id_tutor = %s"""
                pets = consultar_db(query_pets, (tutor['id_tutor'],), one=False)
                tutor['pets'] = pets if pets else []

                for pet in pets: 
                    if 'data_nascimento' in pet and pet['data_nascimento']:
                        pet['data_nascimento'] = pet['data_nascimento'].isoformat()

                if 'data_nascimento' in tutor and tutor['data_nascimento']:
                    tutor['data_nascimento'] = tutor['data_nascimento'].isoformat()

                tutor['pets'] = pets if pets else []
                
                del tutor['senha']
                if 'reset_token' in tutor:
                    del tutor['reset_token']
                if 'reset_token_expires' in tutor:
                    del tutor['reset_token_expires']
                return jsonify(tutor),200
            else: 
                return jsonify({"error": "Credenciais invalidas."}), 401
        except Exception as e:
            print(f"Erro na verificação de senha para o email {email}: {e}")
            return jsonify({"error": "Credcenciais inválidas."}), 401
    else:
        return jsonify({"error": "Credenciais invalidas."}), 401

@auth_bp.route('/api/auth/google', methods=['POST'])
def auth_google():
    GOOGLE_CLIENT_ID = current_app.config['GOOGLE_CLIENT_ID']
    data = request.get_json(force=True)
    token = data.get('id_token')
    if not token:
        return jsonify({'error': 'id_token é obrigatório.'}), 400

    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo.get('email')
        nome = idinfo.get('name') or idinfo.get('given_name') or ''
        picture = idinfo.get('picture')

        tutor = consultar_db("SELECT * FROM tutores WHERE email = %s", (email,), one=True)

        if not tutor:
            created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            senha_placeholder = secrets.token_hex(16)
            senha_hash = bcrypt.hashpw(senha_placeholder.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            new_tutor_id, error = executar_db(
                "INSERT INTO tutores (nome_completo, email, senha, foto_perfil_tutor, created_at, notif_geral, notif_vacinas, notif_consultas, notif_produtos) VALUES (%s, %s, %s, %s, %s, TRUE, TRUE, TRUE, TRUE) RETURNING id_tutor",
                (nome, email, senha_hash, picture, created_at),
                return_id=True
            )

            if 'data_nascimento' in tutor and tutor['data_nascimento']:
                tutor['data_nascimento'] = tutor['data_nascimento'].isoformat()
            
            if error:
                print(f"Erro ao criar tutor pelo google: {error}")
                return jsonify({'error': f'Erro ao criar novo usuário'}), 500
            
            tutor = consultar_db("SELECT * FROM tutores WHERE id_tutor = %s", (new_tutor_id,), one=True)

        if not tutor:
            return jsonify({'error': 'Falha ao recuperar os dados do usuário após o login.'}), 500

        query_pets = """SELECT P.* FROM pets p
                        JOIN tutor_pet tp ON p.id_pet = tp.id_pet
                        WHERE tp.id_tutor = %s"""
        
        pets = consultar_db(query_pets, (tutor['id_tutor'],), one=False)

        for pet in pets:
            if 'data_nascimento' in pet and pet['data_nascimento']:
                pet['data_nascimento'] = pet['data_nascimento'].isoformat()

        tutor['pets'] = pets if pets else []

        if 'senha' in tutor:
            del tutor['senha']
        if 'reset_token' in tutor:
            del tutor['reset_token']
        if 'reset_token_expires' in tutor:
            del tutor['reset_token_expires']

        return jsonify(tutor), 200

    except ValueError as e:
        print("Token inválido:", e)
        return jsonify({'error': 'Token do Google inválido.'}), 400
    except Exception as e:
        print("Erro interno google auth:", e)
        return jsonify({'error': 'Erro interno do servidor ao autenticar com Google.'}), 500



@auth_bp.route('/api/tutores/esqueci-senha', methods=['POST'])
def esqueci_senha():
    dados = request.json
    email = dados.get('email')

    if not email:
        return jsonify({"error": "Email é obrigatório."}), 400
    
    tutor = consultar_db("SELECT * FROM tutores WHERE email = %s", (email,), one=True)

    if tutor:
        token = secrets.token_urlsafe(32)
        token_expira = datetime.now() + timedelta(hours=1)

        query = "UPDATE tutores " \
        "        SET reset_token = %s, reset_token_expires = %s " \
        "        WHERE email = %s"
        _, error = executar_db(query, (token, token_expira, email))

        if error:
            return jsonify({"error": f"Erro ao gerar token de redefinição: {error}"}), 500
        
        try:
            link_redefinicao = f"http://localhost:5173/redefinir-senha?token={token}"

            msg = Message(
                "Redefinição de Senha - PetCare",
                sender=current_app.config['MAIL_USERNAME'],
                recipients=[email]
            )

            msg.html = f"""
                <p>Olá,</p>
                <p>Você solicitou a redefinição da sua senha no sistema PetCare.</p>
                <p>Clique no link abaixo para criar uma nova senha. Este link é válido por 1 hora:</p>
                <p><a href="{link_redefinicao}">Redefinir Minha Senha</a></p>
                <p>Se você não solicitou esta alteração, por favor, ignore este e-mail.</p>
                <p>Atenciosamente,<br>Equipe PetCare</p>
            """

            mail.send(msg)
        except Exception as e:
            print(f"Erro ao enviar email: {str(e)}")
            return jsonify({"error": f"Erro ao enviar email de redefinicao: {str(e)}"}), 500
        pass
        
    return jsonify({"message": "Se o email estiver cadastrado, um link de redefinicao foi enviado."}), 200


@auth_bp.route('/api/tutores/redefinir-senha', methods=['POST'])
def redefinir_senha():
    dados = request.json
    token = dados.get('token')
    nova_senha = dados.get('nova_senha')

    if not token or not nova_senha:
        return jsonify({"error": "Token e nova senha sao obrigatorios."}), 400
    
    query = "SELECT * " \
    "        FROM tutores " \
    "        WHERE reset_token = %s AND reset_token_expires > %s"
    tutor = consultar_db(query, (token, datetime.now()), one=True)

    if not tutor:
        return jsonify({"error": "Token invalido ou expirado."}), 400
    
    nova_senha_hash = bcrypt.hashpw(nova_senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    query_update = "UPDATE tutores " \
    "               SET senha = %s, reset_token = NULL, reset_token_expires = NULL " \
    "               WHERE id_tutor = %s"
    _, error = executar_db(query_update, (nova_senha_hash, tutor['id_tutor']))

    if error:
        return jsonify({"error": f"Erro ao redefinir senha: {error}"}), 500
    
    return jsonify({"message": "Senha redefinida com sucesso."}), 200

@auth_bp.route('/api/tutores/<int:id_tutor>/alterar-senha', methods=['PUT'])
def alterar_senha(id_tutor):
    dados = request.json
    senha_atual = dados.get('senha_atual')
    nova_senha = dados.get('nova_senha')

    if not senha_atual or not nova_senha:
        return jsonify({"error": "Senha atual e nova senha são obrigatórias"}), 400

    query_busca = "SELECT senha FROM tutores WHERE id_tutor = %s"
    tutor = consultar_db(query_busca, (id_tutor,), one=True)
    
    if not tutor:
        return jsonify({"error": "Tutor não encontrado"}), 404
    
    senha_hash_banco = tutor['senha']

    if isinstance(senha_hash_banco, str):
        senha_hash_banco = senha_hash_banco.encode('utf-8')

    if not bcrypt.checkpw(senha_atual.encode('utf-8'), senha_hash_banco):
        return jsonify({"error": "A senha atual está incorreta."}), 401

    nova_senha_hash = bcrypt.hashpw(nova_senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    query_update = "UPDATE tutores SET senha = %s WHERE id_tutor = %s"
    _, error = executar_db(query_update, (nova_senha_hash, id_tutor))

    if error:
        return jsonify({"error": f"Erro ao atualizar senha: {error}"}), 500

    return jsonify({"message": "Senha alterada com sucesso!"}), 200


@auth_bp.route('/api/tutores/<int:id_tutor>/alterar-email', methods=['PUT'])
def alterar_email(id_tutor):
    dados = request.json
    novo_email = dados.get('novo_email')
    senha_atual = dados.get('senha_atual')

    if not novo_email or not senha_atual:
        return jsonify({"error": "Novo email e senha atual são obrigatórios"}), 400

    query = "SELECT senha FROM tutores WHERE id_tutor = %s"
    tutor = consultar_db(query, (id_tutor,), one=True)

    if not tutor:
        return jsonify({"error": "Usuário não encontrado."}), 404
    
    senha_hash_banco = tutor['senha']

    if isinstance(senha_hash_banco, str):
        senha_hash_banco = senha_hash_banco.encode('utf-8')

    if not bcrypt.checkpw(senha_atual.encode('utf-8'), senha_hash_banco):
        return jsonify({"error": "Senha incorreta. Não foi possível alterar o email."}), 401
    
    query_update = "UPDATE tutores SET email = %s WHERE id_tutor = %s"
    _, erro_update = executar_db(query_update, (novo_email, id_tutor))

    if erro_update:
         return jsonify({"error": "Erro ao atualizar email. Talvez este email já esteja em uso."}), 500

    return jsonify({"message": "Email atualizado com sucesso!"}), 200


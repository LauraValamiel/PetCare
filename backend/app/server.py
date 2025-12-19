from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import locale
import bcrypt
import secrets
from datetime import datetime, timedelta, time as time_obj
from flask_mail import Mail, Message
from werkzeug.utils import secure_filename
from urllib.parse import quote_plus
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests



# Carregar variáveis de ambiente do arquivo .env
load_dotenv(dotenv_path='../.env')

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')

# Conexão com o banco de dados 
class DatabaseConnection:
    _instance = None
    _connection = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseConnection, cls).__new__(cls)
            cls._instance._connect()
        return cls._instance
    
    def _connect(self):
        try:
            self._connection = psycopg2.connect(
                host='localhost',
                database=os.environ.get('POSTGRES_DB'),
                user=os.environ.get('POSTGRES_USER'),
                password=os.environ.get('POSTGRES_PASSWORD')
            )
            print("Conexao com o banco de dados estabelecida.")
        except Exception as e:
            print(f"Erro ao conectar ao banco de dados: {e}")
            self._connection = None
    
    def get_connection(self):
        if self._connection is None or self._connection.closed !=0:
            self._connect()
        return self._connection
    
    def close_connection(self):
        if self._connection and not self._connection.closed:
            self._connect.close()
            print("Conexao com o banco de dados fechada.")


# Outras funções para manipular o banco de dados
def consultar_db(query, params=None, one=False):
    conn = DatabaseConnection().get_connection()
    if not conn:
        return None if one else []
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if one:
                return cur.fetchone()
            return cur.fetchall()
    except Exception as e:
        print(f"Erro ao consultar o banco de dados: {e}")
        conn.rollback()
        return None if one else []

def executar_db(query, params=None, return_id=False):
    conn = DatabaseConnection().get_connection()
    if not conn:
        return None, "Falha na conexao com o banco de dados."
    
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            if return_id:
                new_id = cur.fetchone()[0]
                conn.commit()
                return new_id, None
            conn.commit()
            return cur.rowcount, None
    except Exception as e:
        conn.rollback()
        print(f"Erro ao executar comando no banco de dados: {e}")
        return None, str(e)


# Inicializando o Flask
app = Flask(__name__)
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
CORS(app, resources={r"/api/*": {"origins":"http://localhost:5173", "methods": ["GET", "POST", "PUT", "DELETE"], "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]}})


# Configuração do Flask-Mail com as variáveis de ambiente
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = False

mail_use_ssl_str = os.environ.get('MAIL_USE_SSL')
mail_use_tls_str = os.environ.get('MAIL_USE_TLS')

if mail_use_ssl_str:
    app.config['MAIL_USE_SSL'] = mail_use_ssl_str.lower() in ['true', 'on', '1']
elif mail_use_tls_str:
    app.config['MAIL_USE_TLS'] = mail_use_tls_str.lower() in ['true', 'on', '1']
else:
    app.config['MAIL_USE_TLS'] = True


# Inicializa a extensão Mail
mail = Mail(app)
locale.setlocale(locale.LC_TIME, 'pt_BR.utf8')


# Função para verificar os tipos de arquivos permitidos
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Função para criar eventos e enviar alertas
def criar_evento_e_enviar_alerta(id_pet, titulo, data_evento, hora_evento=None, descricao=''):

    pet = consultar_db("SELECT nome_pet " \
    "                   FROM pets " \
    "                   WHERE id_pet = %s", (id_pet,), one=True)

    if not pet:
        return jsonify({"error": "Alerta nao enviado, pet nao encontrado"}), 404
    
    query_tutores = """ SELECT t.email 
                        FROM tutores t 
                        JOIN tutor_pet tp ON t.id_tutor = tp.id_tutor 
                        WHERE tp.id_pet = %s"""

    tutores = consultar_db(query_tutores, (id_pet,))
    if not tutores:
        return jsonify({"error": "Alerta nao enviado, nenhum tutor associado ao pet"}), 404
    
    destinatarios = [tutor['email'] for tutor in tutores]
    nome_pet = pet['nome_pet']
    titulo_completo = f"Alerta para {nome_pet}: {titulo}"

    try:
        data_evento_obj = None
        if isinstance(data_evento, str):
            data_evento_obj = datetime.strptime(data_evento.split('T')[0], '%Y-%m-%d').date()

        elif isinstance(data_evento, datetime.date):
            data_evento_obj = data_evento

        if data_evento_obj is None:
            print(f"Formato de data inválido ou ausente: {data_evento}")
            return
        
        hora_evento_obj = None
        if hora_evento:
            print(f"DEBUG ALERTA: Hora recebida: {hora_evento}")
            if isinstance(hora_evento, str):
                hora_limpa = hora_evento.split('.')[0]
                hora_limpa = hora_limpa.upper().replace('Z', '')
                for fmt in ('%H:%M:%S', '%H:%M'):
                    try:
                        
                        hora_evento_obj = datetime.strptime(hora_limpa, fmt).time()
                        break
                    except ValueError:
                        continue
            elif isinstance(hora_evento, time_obj):
                hora_evento_obj = hora_evento
        
        if hora_evento_obj:
            data_inicio = datetime.combine(data_evento_obj, hora_evento_obj)
            data_fim = data_inicio + timedelta(hours=1)
            datas_formatadas = f"{data_inicio.strftime('%Y%m%dT%H%M%S')}/{data_fim.strftime('%Y%m%dT%H%M%S')}"

            data_email_formatada = data_inicio.strftime('%d/%m/%Y às %H:%M')
            print(f"DEBUG ALERTA: Data formatada com hora: {data_email_formatada}")
        else:
            data_inicio = data_evento_obj
            data_fim = data_evento_obj + timedelta(days=1)
            datas_formatadas = f"{data_inicio.strftime('%Y%m%d')}/{data_fim.strftime('%Y%m%d')}"

            data_email_formatada = data_inicio.strftime('%d/%m/%Y')
            print(f"DEBUG ALERTA: Data formatada sem hora: {data_email_formatada}")

    except Exception as e:
        print(f"Erro ao processar data/hora para alerta: {e}")
        return 
            

    #data_evento_obj = datetime.fromisoformat(data_evento).date() if isinstance(data_evento, str) else data_evento

    #if hora_evento:
     #   hora_evento_obj = None
      #  if isinstance(hora_evento, str):
       #     for fmt in ('%H:%M:%S', '%H:%M'):
        #        try:
         #           hora_evento_obj = datetime.strptime(hora_evento, fmt).time()
          #          break
           #     except ValueError:
            #        continue
       # else:
        #    hora_evento_obj = hora_evento
        
        #if hora_evento_obj is None:
         #   print(f"Formato de hora invalido: {hora_evento}")
          #  return

        #data_inicio = datetime.combine(data_evento_obj, hora_evento_obj)
        #data_fim = data_inicio + timedelta(hours=1)
        #datas_formatadas = f"{data_inicio.strftime('%Y%m%dT%H%M%S')}/{data_fim.strftime('%Y%m%dT%H%M%S')}"

    #else:
     #   data_fim = data_evento_obj + timedelta(days=1)
      #  datas_formatadas = f"{data_evento_obj.strftime('%Y%m%d')}/{data_fim.strftime('%Y%m%d')}"

    base_url = "https://www.google.com/calendar/render?action=TEMPLATE"
    link_agenda = (
        f"{base_url}"
        f"&text={quote_plus(titulo_completo)}"
        f"&dates={datas_formatadas}"
        f"&details={quote_plus(descricao)}"
    )

    try: 
        msg = Message( subject=f"Lembrete PetCare: {titulo_completo}", recipients=destinatarios)

        msg.html = f"""
            <p>Olá,</p>
            <p>Este é um lembrete sobre um compromisso importante para <strong>{nome_pet}</strong>:</p>
            <p><strong>Evento:</strong> {titulo}</p>
            <p><strong>Data:</strong> {data_email_formatada}</p>
            <p>Para não se esquecer, adicione este evento à sua agenda clicando no link abaixo:</p>
            <p><a href="{link_agenda}" style="padding: 10px 15px; background-color: #4285F4; color: white; text-decoration: none; border-radius: 5px;">
                Adicionar à Agenda Google
            </a></p>
            <p>Atenciosamente,<br>Equipe PetCare</p>
        """
        mail.send(msg)
        print(f"Email de alerta enviado com sucesso para: {destinatarios}.")

    except Exception as e:
        print(f"Erro ao enviar email de alerta: {e}")


# ------------------------------------------------ Rotas  ------------------------------------------------

@app.route('/api/status')
def status():
    return jsonify({"status": "API is running"}), 200


# ------------------------------------------------ Rotas Google ------------------------------------------------

@app.route('/api/auth/google', methods=['POST'])
def auth_google():
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
            # Se o tutor não existe, cria um novo
            created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            senha_placeholder = secrets.token_hex(16)
            senha_hash = bcrypt.hashpw(senha_placeholder.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Ajuste para inserir apenas os campos necessários, assumindo que outros são nulos/padrão
            new_tutor_id, error = executar_db(
                "INSERT INTO tutores (nome_completo, email, senha, foto_perfil_tutor, created_at) VALUES (%s, %s, %s, %s, %s) RETURNING id_tutor",
                (nome, email, senha_hash, picture, created_at),
                return_id=True
            )

            if 'data_nascimento' in tutor and tutor['data_nascimento']:
                tutor['data_nascimento'] = tutor['data_nascimento'].isoformat()
            
            if error:
                print(f"Erro ao criar tutor pelo google: {error}")
                return jsonify({'error': f'Erro ao criar novo usuário'}), 500
            
            # Busca o tutor recém-criado para retornar os dados completos
            tutor = consultar_db("SELECT * FROM tutores WHERE id_tutor = %s", (new_tutor_id,), one=True)

        # Se, por algum motivo, o tutor ainda for nulo, retorna um erro
        if not tutor:
            return jsonify({'error': 'Falha ao recuperar os dados do usuário após o login.'}), 500

        query_pets = """SELECT P.* FROM pets p
                        JOIN tutor_pet tp ON p.id_pet = tp.id_pet
                        WHERE tp.id_tutor = %s"""
        
        pets = consultar_db(query_pets, (tutor['id_tutor'],), one=False)

        for pet in pets:
            if 'data_nascimento' in pet and pet['data_nascimento']:
                pet['data_nascimento'] = pet[data_nascimento].isoformat()

        tutor['pets'] = pets if pets else []

        # Remover campos sensíveis antes de enviar a resposta
        # A verificação 'in' garante que não haverá erro se a chave não existir
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
        print("Erro interno google auth:", e) # A mensagem de erro que você viu
        return jsonify({'error': 'Erro interno do servidor ao autenticar com Google.'}), 500




# ------------------------------------------------ Rotas Tutores  ------------------------------------------------

@app.route('/api/login', methods=['POST'])
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

    

@app.route('/api/novo-tutor', methods=['POST'])
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
    
    # Gerar o hash da senha
    senha_hash = bcrypt.hashpw(senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    query = "INSERT INTO tutores (nome_completo, celular, email, cpf, data_nascimento, genero_tutor, senha, foto_perfil_tutor, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s) " \
    "        RETURNING id_tutor"
    _, error = executar_db(query, (nome_completo, celular, email, cpf, data_nascimento, genero_tutor, senha_hash, foto_perfil_tutor, created_at))

    if error:
        return jsonify({"error": f"Erro ao criar tutor: {error}"}), 500
    
    return jsonify({"message": "Tutor criado com sucesso."}), 201


@app.route('/api/tutores/<int:id_tutor>', methods=['PUT'])
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


@app.route('/api/tutores/<int:id_tutor>/atualizar-foto', methods=['PUT'])
def atualizar_foto_tutor(id_tutor):
    if 'foto_perfil_nova' not in request.files: # Use a chave 'foto_perfil_nova' ou 'foto_perfil'
        return jsonify({"error": "Nenhuma foto enviada."}), 400
    
    file = request.files['foto_perfil_nova'] # Use a chave correta
    
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"error": "Arquivo inválido ou não permitido."}), 400

    filename = secure_filename(file.filename)
    unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))

    # 1. Atualiza o banco de dados com o novo filename
    query = "UPDATE tutores SET foto_perfil_tutor = %s WHERE id_tutor = %s"
    _, error = executar_db(query, (unique_filename, id_tutor))

    if error:
        return jsonify({"error": f"Erro ao salvar o nome da foto no banco: {error}"}), 500

    # 2. Retorna o novo filename para o frontend
    return jsonify({"message": "Foto atualizada.", "foto_perfil_tutor": unique_filename}), 200
  
@app.route('/api/tutores', methods=['GET'])
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


@app.route('/api/tutores/<int:id_tutor>', methods=['GET'])
def tutor_por_id(id_tutor):
    query = "SELECT * " \
    "        FROM tutores " \
    "        WHERE id_tutor = %s"
    tutor = consultar_db(query, (id_tutor, ), one=False)
    
    if tutor:
        return jsonify(tutor if tutor else []), 200
    return jsonify({"error": "Tutor nao encontrado."}), 404
    

@app.route('/api/tutores/<int:id_tutor>/pets/<int:id_pet>/desassociar', methods=['DELETE'])
def desassociar_pet(id_tutor, id_pet):
        query = "DELETE FROM tutor_pet" \
        "        WHERE id_tutor = %s AND id_pet = %s"
        _, error = executar_db(query, (id_tutor, id_pet))
        
        if error:
            return jsonify({"error": f"Erro ao deassociar tutor de pet: {error}"}), 500
        return jsonify({"message": "Tutor desassociado de pet com sucesso."}), 200


@app.route('/api/tutores/<int:id_tutor>/tutores-e-pets', methods=['GET'])
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


# ------------------------------------------------ Rotas Pets ------------------------------------------------

@app.route('/api/uploads/<string:filename>', methods=['GET'])
def get_uploaded_file(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except FileNotFoundError:
        return jsonify({"error": "Arquivo não encontrado."}), 404

@app.route('/api/tutores/<int:id_tutor>/pets', methods=['GET'])
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


@app.route('/api/tutores/<int:id_tutor>/pets/<int:id_pet>', methods=['GET'])
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


@app.route('/api/tutores/<int:id_tutor>/pets/novo-pet', methods=['POST'])
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

            file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
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


@app.route('/api/tutores/<int:id_tutor>/pets/<int:id_pet>/atualizar-pet', methods=['PUT'])
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
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
                foto_perfil_filename = unique_filename

        query = """UPDATE pets 
                   SET nome_pet = %s, especie = %s, raca = %s, genero = %s, data_nascimento = %s, peso = %s, foto_perfil = %s, idade = %s, castrado = %s 
                   WHERE id_pet = %s AND EXISTS (SELECT 1 FROM tutor_pet tp WHERE tp.id_pet = pets.id_pet AND tp.id_tutor = %s)"""
        
        castrado_bool = castrado_str.lower() == 'true' if isinstance(castrado_str, str) else bool(castrado_str)
 
        _, error = executar_db(query, (nome_pet, especie, raca, genero, data_nascimento, peso, foto_perfil_filename, idade, castrado_bool, id_pet, id_tutor))

        if error:
            return jsonify({"error": f"Erro ao atualizar pet: {error}"}), 500
        return jsonify({"message": "Pet atualizado com sucesso."}), 200


@app.route('/api/tutores/<int:id_tutor>/pets/<int:id_pet>/deletar-pet', methods=['DELETE'])
def deletar_pet(id_pet, id_tutor):
    query = """DELETE FROM pets  
                USING tutor_pet tp
                WHERE pets.id_pet = tp.id_pet AND pets.id_pet = %s AND tp.id_tutor = %s"""
    _, error = executar_db(query, (id_pet, id_tutor))
        
    if error:
            return jsonify({"error": f"Erro ao deletar pet: {error}"}), 500
    return jsonify({"message": "Pet deletado com sucesso."}), 200


@app.route('/api/tutores/<int:id_tutor>/pets/<int:id_pet>/convidar-tutor', methods=['POST'])
def convidar_tutor_para_pet(id_tutor, id_pet):
    dados = request.json
    email_tutor_convidado = dados.get('email')

    if not email_tutor_convidado or not id_tutor:
        return jsonify({"error": "Email do tutor convidado e ID do tutor remetente sao obrigatorios."}), 400

    tutor_convidado = consultar_db("SELECT * FROM tutores WHERE email = %s", (email_tutor_convidado,), one=True)
    if not tutor_convidado:
        return jsonify({"error": "Tutor com o email fornecido nao encontrado."}), 404
    
    pet = consultar_db("SELECT * FROM pets WHERE id_pet = %s", (id_pet), one=True)
    if not pet:
        return jsonify({"error": "Pet nao encontrado."}), 404
    
    tutor_remetente = consultar_db("SELECT * FROM tutores WHERE id_tutor = %s", (id_tutor,), one=True)
    if not tutor_remetente:
        return jsonify({"error": "Tutor remetente não encontrado."}), 404
    
    id_tutor_convidado = tutor_convidado['id_tutor']
    query_assoc = "INSERT INTO tutor_pet (id_tutor, id_pet, nivel_permissao_1)" \
    "              VALUES (%s, %s, %s)"
    _, error = executar_db(query_assoc, (id_tutor_convidado, id_pet, 'convidado'))

    if error:
        if 'unique constraint' in error:
            return jsonify({"error": "O tutor ja esta associado a este pet."}), 400
        
        return jsonify({"error": f"Erro ao associar tutor ao pet: {error}"}),

    try:
        nome_pet = pet['nome_pet']
        nome_remetente = tutor_remetente['nome_completo']
        link_app = "http://localhost:5173/login"

        msg = Message("Você foi convidado para cuidar de {nome_pet} no PetCare!", sender= app.config['MAIL_DEFAULT_SENDER'], recipients=[email_tutor_convidado])

        msg.html = f"""
            <p>Olá,</p>
            <p><strong>{nome_remetente}</strong> convidou você para ajudar a gerenciar o perfil de <strong>{nome_pet}</strong> no PetCare.</p>
            <p>Acesse sua conta para ver as informações do pet e começar a colaborar.</p>
            <p><a href="{link_app}">Acessar o PetCare</a></p>
            <p>Atenciosamente,<br>Equipe PetCare</p>
        """
        
        mail.send(msg)

    except Exception as e:
        return jsonify({"error": f"Erro ao enviar email de convite: {str(e)}"}), 500


    return jsonify({"message": "Tutor convidado e associado ao pet com sucesso."}), 201


# ------------------------------------------------ Rotas Vacinas ------------------------------------------------

@app.route('/api/pets/<int:id_pet>/vacinas', methods=['GET'])
def get_vacinas_por_pet(id_pet):
    query = "SELECT * " \
    "        FROM vacinas " \
    "        WHERE id_pet = %s"
    vacinas = consultar_db(query, (id_pet,))

    for vacina in vacinas:
        if 'data_vacinacao' in vacina and vacina['data_vacinacao']:
            vacina['data_vacinacao'] = vacina['data_vacinacao'].isoformat()
        
        if 'proxima_dose' in vacina and vacina['proxima_dose']:
            vacina['proxima_dose'] = vacina['proxima_dose'].isoformat()

    return jsonify(vacinas), 200


@app.route('/api/pets/<int:id_pet>/nova-vacina', methods=['POST'])
def adicionar_vacina_por_pet(id_pet):
    dados = request.json
    nome_vacina = dados.get('nome_vacina')
    lote = dados.get('lote')
    data_vacinacao = dados.get('data_vacinacao')
    nome_veterinario = dados.get('nome_veterinario')
    proxima_dose = dados.get('proxima_dose')
    preco_vacina = dados.get('preco_vacina')
    local_aplicacao = dados.get('local_aplicacao')
    observacoes = dados.get('observacoes')

    if not all([nome_vacina, lote, data_vacinacao, nome_veterinario, proxima_dose, preco_vacina, local_aplicacao]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400
    
    enviar_notificacao = dados.get('enviar_notificacao', True)

    query = """INSERT INTO vacinas (id_pet, nome_vacina, lote, data_vacinacao, nome_veterinario, proxima_dose, preco_vacina, local_aplicacao, observacoes) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    _, error = executar_db(query, (id_pet, nome_vacina, lote, data_vacinacao, nome_veterinario, proxima_dose, preco_vacina, local_aplicacao, observacoes))

    if error:
        return jsonify({"error": f"Erro ao adicionar vacina: {error}"}), 500    

    if proxima_dose and enviar_notificacao:
        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=f"Proxima dose da vacina {dados.get('nome_vacina')}",
            data_evento=proxima_dose,
            descricao=f"Lembrete para a proxima dose da vacina {dados.get('nome_vacina')}."
        )
    
    return jsonify({"message": "Vacina adicionada com sucesso."}), 201


@app.route('/api/pets/<int:id_pet>/deletar-vacina/<int:id_vacina>', methods=['DELETE'])
def deletar_vacina(id_pet, id_vacina):

    query_vacina = """SELECT id_vacina
                      FROM vacinas
                      WHERE id_pet = %s AND id_vacina = %s"""
    vacina = consultar_db(query_vacina, (id_pet, id_vacina), one=True)
    if not vacina:
        return jsonify({"error": "Vacina nao encontrada ou nao pertence ao pet"})
    
    query = """DELETE FROM vacinas
                WHERE id_pet = %s AND id_vacina = %s"""
    rows_affected, error = executar_db(query, (id_pet, id_vacina))
        
    if error:
        return jsonify({"error": f"Erro ao deletar vacina: {error}"}), 500
    
    if rows_affected == 0:
        return jsonify({"message": "Nenhuma vacina encontrada"})
    

    return jsonify({"message": "Vacina deletada com sucesso."}), 200


@app.route('/api/pets/<int:id_pet>/editar-vacina/<int:id_vacina>', methods=['PUT'])
def editar_vacina(id_pet, id_vacina):

    dados = request.json
    nome_vacina = dados.get('nome_vacina')
    lote = dados.get('lote')
    data_vacinacao = dados.get('data_vacinacao')
    nome_veterinario = dados.get('nome_veterinario')
    proxima_dose = dados.get('proxima_dose')
    preco_vacina = dados.get('preco_vacina')
    local_aplicacao = dados.get('local_aplicacao')
    observacoes = dados.get('observacoes')

    enviar_notificacao = dados.get('enviar_notificacao', True)

    query = """UPDATE vacinas 
               SET nome_vacina = %s, lote = %s, data_vacinacao = %s, nome_veterinario = %s, proxima_dose = %s, preco_vacina = %s, local_aplicacao = %s, observacoes = %s 
               WHERE id_pet = %s AND id_vacina = %s"""
    _, error = executar_db(query, (nome_vacina, lote, data_vacinacao, nome_veterinario, proxima_dose, preco_vacina, local_aplicacao, observacoes, id_pet, id_vacina))

    if proxima_dose and enviar_notificacao:
        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=f"Proxima dose da vacina {dados.get('nome_vacina')}",
            data_evento=proxima_dose,
            descricao=f"Lembrete para a proxima dose da vacina {dados.get('nome_vacina')}."
        )
    

    if error:
        return jsonify({"error": f"Erro ao atualizar vacina: {error}"}), 500
    return jsonify({"message": "Vacina atualizado com sucesso."}), 200


# ------------------------------------------------ Rotas Consultas ------------------------------------------------

@app.route('/api/pets/<int:id_pet>/consultas', methods=['GET'])
def consultas_pet(id_pet):
    query = "SELECT * " \
    "        FROM consultas " \
    "        WHERE id_pet = %s"
    consultas = consultar_db(query, (id_pet,))

    for consulta in consultas:
        if 'hora' in consulta and consulta['hora'] is not None:
            consulta['hora'] = consulta['hora'].strftime('%H:%M:%S')

    return jsonify(consultas), 200


@app.route('/api/pets/<int:id_pet>/nova-consulta', methods=['POST'])
def criar_consulta_pet(id_pet):
    dados = request.json
    data_consulta = dados.get('data_consulta')
    hora = dados.get('hora')
    motivo = dados.get('motivo')
    diagnostico = dados.get('diagnostico')
    tratamento = dados.get('tratamento')
    nome_clinica = dados.get('nome_clinica')
    nome_veterinario = dados.get('nome_veterinario')
    preco_consulta = dados.get('preco_consulta')

    if not all([data_consulta, hora, motivo, diagnostico, tratamento, nome_clinica, nome_veterinario, preco_consulta]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400  
    
    query = """INSERT INTO consultas (id_pet, data_consulta, hora, motivo, diagnostico, tratamento, nome_clinica, nome_veterinario, preco_consulta) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    _, error = executar_db(query, (id_pet, data_consulta, hora, motivo, diagnostico, tratamento, nome_clinica, nome_veterinario, preco_consulta))   

    if error:
        return jsonify({"error": f"Erro ao criar consulta: {error}"}), 500
    
    return jsonify({"message": "Consulta criada com sucesso."}), 201


@app.route('/api/pets/<int:id_pet>/editar-consulta/<int:id_consulta>', methods=['PUT'])
def editar_consulta_pet(id_pet, id_consulta):
    dados = request.json
    data_consulta = dados.get('data_consulta')
    hora = dados.get('hora')
    motivo = dados.get('motivo')
    diagnostico = dados.get('diagnostico')
    tratamento = dados.get('tratamento')
    nome_clinica = dados.get('nome_clinica')
    nome_veterinario = dados.get('nome_veterinario')
    preco_consulta = dados.get('preco_consulta')

    query = """UPDATE consultas 
               SET data_consulta = %s, hora = %s, motivo = %s, diagnostico = %s, tratamento = %s, nome_clinica = %s, nome_veterinario = %s, preco_consulta = %s
               WHERE id_pet = %s  AND id_consulta = %s"""
    _, error = executar_db(query, (data_consulta, hora, motivo, diagnostico, tratamento, nome_clinica, nome_veterinario, preco_consulta, id_pet, id_consulta))   

    if error:
        return jsonify({"error": f"Erro ao editar consulta: {error}"}), 500
    
    return jsonify({"message": "Consulta atualizado com sucesso."}), 200


@app.route('/api/pets/<int:id_pet>/deletar-consulta/<int:id_consulta>', methods=['DELETE'])
def deletar_consulta(id_pet, id_consulta):

    query_consulta = """SELECT id_consulta
                        FROM consultas
                        WHERE id_pet = %s AND id_consulta = %s"""
    
    consulta = consultar_db(query_consulta, (id_pet, id_consulta), one=True)
    if not consulta:
        return jsonify({"error": "Consulta nao encontrada ou nao pertence ao pet"})


    query = """DELETE FROM consultas
               WHERE id_pet = %s AND id_consulta = %s"""

    rows_affected, error = executar_db(query, (id_pet, id_consulta))
        
    if error:
        return jsonify({"error": f"Erro ao deletar consulta: {error}"}), 500
    
    if rows_affected == 0:
        return jsonify({"message": "Nenhuma consulta encontrada"})

    return jsonify({"message": "Consulta deletada com sucesso."}), 200


@app.route('/api/pets/consultas/<int:id_consulta>/anexar-arquivo', methods=['POST'])
def anexar_arquivo(id_consulta):

    if 'file' not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado."}), 400
    
    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "Nenhum arquivo selecionado."}), 400
    
    query = "SELECT id_pet " \
    "        FROM consultas " \
    "        WHERE id_consulta = %s"

    consulta = consultar_db(query, (id_consulta,), one=True)
    if not consulta:
        return jsonify({"error": "Consulta nao encontrada."}), 404
    
    id_pet = consulta['id_pet']

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)

        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"

        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))

        query = "INSERT INTO arquivos_consulta (id_consulta, id_pet, nome_arquivo, tipo_arquivo) " \
        "        VALUES (%s, %s, %s, %s)"
        _, error = executar_db(query, (id_consulta, id_pet, unique_filename, file.mimetype))
        if error:
            return jsonify({"error": f"Erro ao anexar arquivo: {error}"}), 500

        return jsonify({"message": "Arquivo anexado com sucesso.", "nome_arquivo": unique_filename}), 201
    else:
        return jsonify({"error": "Tipo de arquivo nao permitido."}), 400
    
    
@app.route('/api/uploads/string:<filename>/download', methods=['GET'])
def download_arquivo(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "Arquivo nao encontrado."}), 404
    

# ------------------------------------------------ Rotas Remédios ------------------------------------------------

@app.route('/api/pets/<int:id_pet>/remedios', methods=['GET'])
def remedios_por_pet(id_pet):
    query = "SELECT * FROM remedios WHERE id_pet = %s"
    remedios = consultar_db(query, (id_pet,))
    return jsonify(remedios), 200


@app.route('/api/pets/<int:id_pet>/novo-remedio', methods=['POST'])
def criar_remedio_pet(id_pet):
    dados = request.json
    nome_remedio = dados.get('nome_remedio')
    tipo_remedio = dados.get('tipo_remedio')
    dosagem = dados.get('dosagem')
    data_inicio = dados.get('data_inicio')
    data_fim = dados.get('data_fim')
    frequencia = dados.get('frequencia')
    proxima_dose = dados.get('proxima_dose')
    observacoes = dados.get('observacoes')
    preco_remedio = dados.get('preco_remedio')

    enviar_notificacao = dados.get('enviar_notificacao', True)

    query = """INSERT INTO remedios (id_pet, nome_remedio, tipo_remedio, dosagem, data_inicio, data_fim, frequencia, proxima_dose, observacoes, preco_remedio)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    _, error = executar_db(query, (id_pet, nome_remedio, tipo_remedio, dosagem, data_inicio, data_fim, frequencia, proxima_dose, observacoes, preco_remedio))
    if error:
        return jsonify({"error": f"Erro ao criar remedio: {error}"}), 500
    
    if proxima_dose and enviar_notificacao:
        query_pet = """SELECT nome_pet 
                       FROM pets
                       WHERE id_pet = %s"""
        pet = consultar_db(query_pet, (id_pet,), one=True) #fazer isso outros
        nome_pet = pet['nome_pet'] if pet else "seu pet"

        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=f"Proxima dose do remedio {dados.get('nome_remedio')}",
            data_evento=proxima_dose,
            descricao=f"Lembrete para a proxima dose do remedio {dados.get('nome_remedio')} para {nome_pet}."
        )

    return jsonify({"message": "Remedio criado com sucesso."}), 201


@app.route('/api/pets/<int:id_pet>/editar-remedio/<int:id_remedio>', methods=['PUT'])
def editar_remedio_pet(id_pet, id_remedio):
    dados = request.json
    nome_remedio = dados.get('nome_remedio')
    tipo_remedio = dados.get('tipo_remedio')
    dosagem = dados.get('dosagem')
    data_inicio = dados.get('data_inicio')
    data_fim = dados.get('data_fim')
    frequencia = dados.get('frequencia')
    proxima_dose_nova = dados.get('proxima_dose')
    observacoes = dados.get('observacoes')
    preco_remedio = dados.get('preco_remedio')

    enviar_notificacao = dados.get('enviar_notificacao', True)

    query = """SELECT proxima_dose
               FROM remedios
               WHERE id_remedio = %s AND id_pet = %s"""
    proxima_dose_original = consultar_db(query, (id_remedio, id_pet), one=True)

    if not proxima_dose_original:
        return jsonify({"error": "Remedio nao encontrado."}), 404
    
    proxima_dose_antiga = proxima_dose_original.get('proxima_dose')

    query_editar = """UPDATE remedios 
               SET nome_remedio = %s, tipo_remedio = %s, dosagem = %s, data_inicio = %s, data_fim = %s, frequencia = %s, proxima_dose = %s, observacoes = %s, preco_remedio = %s
               WHERE id_pet = %s AND id_remedio = %s"""
    _, error = executar_db(query_editar, (nome_remedio, tipo_remedio, dosagem, data_inicio, data_fim, frequencia, proxima_dose_nova, observacoes, preco_remedio, id_pet, id_remedio))
    if error:
        return jsonify({"error": f"Erro ao editar remedio: {error}"}), 500
    
    if proxima_dose_nova:
        proxima_dose_nova_date = datetime.strptime(proxima_dose_nova, '%Y-%m-%d').date()
    
    if proxima_dose_nova_date and proxima_dose_nova_date != proxima_dose_antiga and enviar_notificacao:
        query_pet = """SELECT nome_pet 
                       FROM pets
                       WHERE id_pet = %s"""
        pet = consultar_db(query_pet, (id_pet,), one=True) #fazer isso outros
        nome_pet = pet['nome_pet'] if pet else "seu pet"

        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=f"Proxima dose do remedio {dados.get('nome_remedio')} foi atualizada!",
            data_evento=proxima_dose_nova,
            descricao=f"Lembrete para a proxima dose do remédio {dados.get('nome_remedio')} para {nome_pet}."
        )

    return jsonify({"message": "Remedio atualizado com sucesso."}), 200


@app.route('/api/pets/<int:id_pet>/deletar-remedio/<int:id_remedio>', methods=['DELETE'])
def deletar_remedio_pet(id_pet, id_remedio):

    query_remedio = """SELECT id_remedio
                       FROM remedios
                       WHERE id_remedio = %s AND id_pet = %s"""
    remedio = consultar_db(query_remedio, (id_remedio, id_pet), one=True)
    if not remedio:
        return jsonify({"error": "Remedio nao encontrado ou nao pertence ao pet."}), 404
    
    query_delete = """DELETE FROM remedios
                      WHERE id_remedio = %s AND id_pet = %s"""
    rows_affected, error = executar_db(query_delete, (id_remedio, id_pet))

    if error:
        return jsonify({"error": f"Erro ao deletar remedio: {error}"}), 500
    
    if rows_affected == 0:
        return jsonify({"message": "Nenhum remedio foi deletado"}), 404
    
    return jsonify({"message": "Remedio deletado com sucesso."}), 200


# ------------------------------------------------ Rotas Clínicas Veterinárias  ------------------------------------------------

@app.route('/api/clinicas', methods=['GET'])
def listar_clinicas():
    query = "SELECT * " \
    "        FROM clinicas_veterinarias"
    clinicas = consultar_db(query)
    return jsonify(clinicas), 200


@app.route('/api/nova-clinica', methods=['POST'])
def criar_clinica():
    dados = request.json
    nome_clinica = dados.get('nome_clinica')
    endereco = dados.get('endereco')
    telefone = dados.get('telefone')
    email = dados.get('email')

    if not all([nome_clinica, endereco, telefone, email]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400
    
    query = """INSERT INTO clinicas_veterinarias (nome_clinica, endereco, telefone, email)
               VALUES (%s, %s, %s, %s)"""
    _, error = executar_db(query, (nome_clinica, endereco, telefone, email))
    if error:
        return jsonify({"error": f"Erro ao criar clinica: {error}"}), 500
    
    return jsonify({"message": "Clinica criada com sucesso."}), 201


@app.route('/api/clinica/<int:id_clinica>', methods=['PUT'])
def editar_clinica(id_clinica):
    dados = request.json
    nome_clinica = dados.get('nome_clinica')
    endereco = dados.get('endereco')
    telefone = dados.get('telefone')
    email = dados.get('email')

    if not all([nome_clinica, endereco, telefone, email]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400
    
    query = """UPDATE clinicas_veterinarias 
               SET nome_clinica = %s, endereco = %s, telefone = %s, email = %s
               WHERE id_clinica = %s"""
    _, error = executar_db(query, (nome_clinica, endereco, telefone, email, id_clinica))

    if error:
        return jsonify({"error": f"Erro ao atualizar clinica: {error}"}),500
    
    return jsonify({"message": "Clinica atualizada com sucesso."}), 200


@app.route('/api/clinica/<int:id_clinica>', methods=['DELETE'])
def deletar_clinica(id_clinica):
    query_clinica = """SELECT id_clinica
                       FROM clinicas_veterinarias
                       WHERE id_clinica = %s"""
    clinica = consultar_db(query_clinica, (id_clinica, ), one=True)
    if not clinica:
        return jsonify({"error": "Clinica nao encontrada."}), 404
    
    query_delete = """DELETE FROM clinicas_veterinarias
               WHERE id_clinica = %s"""
    _, error = executar_db(query_delete, (id_clinica,))

    if error:
        return jsonify({"error": "Clinica nao econtrada"}), 500
    
    return jsonify({"message": "Clinica deletada com sucesso."}), 200
        

# ------------------------------------------------ Rotas Produtos ------------------------------------------------

@app.route('/api/pets/<int:id_pet>/produtos', methods=['GET'])
def produtos_por_pet(id_pet):
    query = "SELECT * " \
    "        FROM produtos " \
    "        WHERE id_pet = %s"
    produtos = consultar_db(query, (id_pet,))

    for produto in produtos:
        if 'data_compra' in produto and produto['data_compra']:
            produto['data_compra'] = produto['data_compra'].isoformat()

    return jsonify(produtos), 200


@app.route('/api/pets/<int:id_pet>/novo-produto', methods=['POST'])
def criar_produto_pet(id_pet):
    dados = request.json
    nome_produto = dados.get('nome_produto')
    categoria = dados.get('categoria')
    quantidade = dados.get('quantidade')
    consumo_medio = dados.get('consumo_medio')
    data_compra = dados.get('data_compra')
    preco_compra = dados.get('preco_compra')
    loja = dados.get('loja')
    observacoes = dados.get('observacoes')
    consumo_periodo = dados.get('consumo_periodo', 'dia')

    enviar_notificacao = dados.get('enviar_notificacao', True)

    if not all([nome_produto, categoria, quantidade, consumo_medio, data_compra, preco_compra, loja]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400
    
    query = """INSERT INTO produtos (id_pet, nome_produto, categoria, quantidade, consumo_medio, data_compra, preco_compra, loja, observacoes, consumo_periodo)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    _, error = executar_db(query, (id_pet, nome_produto, categoria, quantidade, consumo_medio, data_compra, preco_compra, loja, observacoes, consumo_periodo))

    if error:
        return jsonify({"error": f"Erro ao criar produto: {error}"}), 500
    
    if enviar_notificacao and quantidade > 0 and consumo_medio > 0:

        dias_duracao = quantidade / consumo_medio

        data_fim = datetime.now() + timedelta(days=dias_duracao)

        dias_antecedencia = 5 if dias_duracao > 10 else 1
        data_alerta = data_fim - timedelta(days=dias_antecedencia)

        if data_alerta > datetime.now():
            criar_evento_e_enviar_alerta(
                id_pet=id_pet,
                titulo=f"Comprar {nome_produto}",
                data_evento=data_alerta.strftime('%Y-%m-%d'),
                descricao=f"O produto {nome_produto} deve acabar em aproximadamente {dias_antecedencia} dias. Verifique o estoque."
            )
    
    return jsonify({"message": "Produto criado com sucesso."}), 201


@app.route('/api/pets/<int:id_pet>/produtos/<int:id_compra>', methods=['PUT'])
def editar_produto(id_compra, id_pet):
    dados = request.json
    nome_produto = dados.get('nome_produto')
    categoria = dados.get('categoria')
    quantidade = dados.get('quantidade')
    consumo_medio = dados.get('consumo_medio')
    data_compra = dados.get('data_compra')
    preco_compra = dados.get('preco_compra')
    loja = dados.get('loja')
    observacoes = dados.get('observacoes')
    consumo_periodo = dados.get('consumo_periodo')

    enviar_notificacao = dados.get('enviar_notificacao', True)

    query = """UPDATE produtos 
               SET nome_produto = %s, categoria = %s, quantidade = %s, consumo_medio = %s, data_compra = %s, preco_compra = %s, loja = %s, observacoes = %s, consumo_periodo = %s
               WHERE id_compra = %s AND id_pet = %s"""
    _, error = executar_db(query, (nome_produto, categoria, quantidade, consumo_medio, data_compra, preco_compra, loja, observacoes, consumo_periodo, id_compra, id_pet))

    if error:
        return jsonify({"error": f"Erro ao atualizar produto: {error}"}), 500

    query_busca = "SELECT * FROM produtos WHERE id_compra = %s AND id_pet = %s"
    produto = consultar_db(query_busca, (id_compra, id_pet), one=True)

    if not produto:
        return jsonify({"message": "Produto atualizado com sucesso."}), 200

    estoque_atual = produto.get('quantidade', 0)
    consumo_medio = produto.get('consumo_medio', 1)

    dias_restantes = float('inf')
    if consumo_medio and consumo_medio > 0:
        dias_restantes = estoque_atual / consumo_medio

    if dias_restantes <= 7:
        data_recompra = datetime.now().date() + timedelta(days=int(dias_restantes))
        if enviar_notificacao:
            criar_evento_e_enviar_alerta(
                id_pet=produto['id_pet'],
                titulo=f"Recomprar {produto['nome_produto']}",
                data_evento=data_recompra,
                descricao=f"O estoque do produto {produto['nome_produto']} esta baixo, lembrete para comprar mais."
            )

    
    
    
    if enviar_notificacao and quantidade > 0 and consumo_medio > 0:

        dias_duracao = quantidade / consumo_medio

        data_fim = datetime.now() + timedelta(days=float(dias_duracao))

        dias_antecedencia = 5 if dias_duracao > 10 else 1
        data_alerta = data_fim - timedelta(days=dias_antecedencia)

        if data_alerta > datetime.now():
            criar_evento_e_enviar_alerta(
                id_pet=id_pet,
                titulo=f"Comprar {nome_produto} (Atualizado)",
                data_evento=data_alerta.strftime('%Y-%m-%d'),
                descricao=f"O produto {nome_produto} deve acabar em aproximadamente {dias_antecedencia} dias. Verifique o estoque."
            )

    return jsonify({"message": "Produto atualizado com sucesso."}), 200


@app.route('/api/pets/<int:id_pet>/produtos/<int:id_compra>/consumo', methods=['POST'])
def registrar_consumo_produto(id_compra):
    dados = request.json
    quantidade_consumida = dados.get('quantidade_consumida', 1)

    enviar_notificacao = dados.get('enviar_notificacao', True)

    query = "UPDATE produtos " \
    "        SET quantidade = quantidade - %s " \
    "        WHERE id_compra = %s"
    _, error = executar_db(query, (quantidade_consumida, id_compra))
    if error:
        return jsonify({"error": f"Erro ao registrar consumo: {error}"}), 500
    
    query_produto = "SELECT * " \
    "                FROM produtos WHERE id_compra = %s"
    produto = consultar_db(query_produto, (id_compra,), one=True)
    if not produto:
        return jsonify({"error": "Produto não encontrado."}), 404
    
    estoque_atual = produto.get('quantidade', 0)
    consumo_medio = produto.get('consumo_medio', 1)

    dias_restantes = float('inf')
    if consumo_medio and consumo_medio > 0:
        dias_restantes = estoque_atual / consumo_medio

    if dias_restantes <= 7:
        data_recompra = datetime.now().date() + timedelta(days=int(dias_restantes))
        if enviar_notificacao:
            criar_evento_e_enviar_alerta(
                id_pet=produto['id_pet'],
                titulo=f"Recomprar {produto['nome_produto']}",
                data_evento=data_recompra,
                descricao=f"O estoque do produto {produto['nome_produto']} esta baixo, lembrete para comprar mais."
            )

    return jsonify({"message": "Consumo registrado com sucesso."}), 200


@app.route('/api/pets/<int:id_pet>/produtos/<int:id_compra>', methods=['DELETE'])
def deletar_produto(id_compra, id_pet):

    query_produto = """SELECT id_compra
                       FROM produtos
                       WHERE id_compra = %s AND id_pet = %s"""
    produto = consultar_db(query_produto, (id_compra, id_pet), one=True)
    if not produto:
        return jsonify({"error": "Produto nao encontrado ou nao pertence a este pet."})
    
    query_delete = """DELETE FROM produtos
                      WHERE id_compra = %s AND id_pet = %s"""
    _, error = executar_db(query_delete, (id_compra, id_pet))
    if error:
        return jsonify({"error": f"Erro ao deletar o produto: {error}"}), 500
    
    return jsonify({"message": "Produto deletado com sucesso."}), 200


# ------------------------------------------------ Rotas Compromissos ------------------------------------------------

@app.route('/api/pets/<int:id_pet>/compromissos', methods=['GET'])
def compromissos_por_pet(id_pet):
    query = "SELECT * " \
    "        FROM compromissos " \
    "        WHERE id_pet = %s"
    compromissos = consultar_db(query, (id_pet,))

    for compromisso in compromissos:
        if 'data_compromisso' in compromisso and compromisso['data_compromisso']:
            compromisso['data_compromisso'] = compromisso['data_compromisso'].isoformat()

        if 'hora' in compromisso and compromisso['hora']:
            compromisso['hora'] = compromisso['hora'].strftime('%H:%M')

        if 'criado_em' in compromisso and compromisso['criado_em']:
            compromisso['criado_em'] = compromisso['criado_em'].isoformat()

    return jsonify(compromissos), 200


@app.route('/api/pets/<int:id_pet>/agendar-compromissos', methods=['POST'])
def agendar_compromisso_pet(id_pet):
    dados = request.json
    titulo = dados.get('titulo')
    descricao = dados.get('descricao')
    data_compromisso = dados.get('data_compromisso')
    hora = dados.get('hora')
    localizacao = dados.get('localizacao')
    lembrete = dados.get('lembrete', False)
    criado_em = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not all([titulo, descricao, data_compromisso, hora, localizacao, lembrete]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400

    enviar_notificacao = dados.get('enviar_notificacao', True)

    query = """INSERT INTO compromissos (id_pet, titulo, descricao, data_compromisso, hora, localizacao, lembrete, criado_em)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
    _, error = executar_db(query, (id_pet, titulo, descricao, data_compromisso, hora, localizacao, lembrete, criado_em))
    if error:
        return jsonify({"error": f"Erro ao agendar compromisso: {error}"}), 500
    
    if lembrete and data_compromisso and enviar_notificacao:
        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=dados.get('titulo'),
            data_evento=data_compromisso,
            hora_evento=hora,
            descricao=dados.get('descricao', '')
        )

    return jsonify({"message": "Compromisso agendado com sucesso."}), 201


@app.route('/api/pets/<int:id_pet>/compromissos/<int:id_compromisso>', methods=['PUT'])
def editar_compromisso_pet(id_pet, id_compromisso):
    dados = request.json
    titulo = dados.get('titulo')
    descricao = dados.get('descricao')
    data_compromisso = dados.get('data_compromisso')
    hora = dados.get('hora')
    localizacao = dados.get('localizacao')
    lembrete = dados.get('lembrete', False)

    enviar_notificacao = dados.get('enviar_notificacao', True)

    query = """SELECT data_compromisso, hora
               FROM compromissos 
               WHERE id_compromisso = %s AND id_pet = %s"""
    compromisso = consultar_db(query, (id_compromisso, id_pet), one=True)

    if not compromisso:
        return jsonify({"error": "Compromisso nao encontrado ou nao pertence a este pet."}), 404
    
    query_update = """UPDATE compromissos
                      SET titulo = %s, descricao = %s, data_compromisso = %s, hora = %s, localizacao = %s, lembrete = %s
                      WHERE id_compromisso = %s AND id_pet = %s"""
    _, error = executar_db(query_update, (titulo, descricao, data_compromisso, hora, localizacao, lembrete, id_compromisso, id_pet))
    if error:
        return jsonify({"error": "Erro ao editar compromisso: {error}"}), 500
    
    data_original = compromisso.get('data_compromisso')
    hora_original = compromisso.get('hora')

    data_nova = datetime.strptime(data_compromisso, '%Y-%m-%d').date() if data_compromisso else None
    hora_nova = datetime.strptime(hora, '%H:%M').time() if hora else None

    if lembrete and (data_original != data_nova or hora_original != hora_nova) and enviar_notificacao:
        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=f"Compromisso atualizado: {titulo}",
            data_evento=data_compromisso,
            hora_evento=hora,
            descricao=descricao
        )

    return jsonify({"message": "Compromisso atualizado com sucesso."}), 200


@app.route('/api/pets/<int:id_pet>/compromissos/<int:id_compromisso>', methods=['DELETE'])
def deletar_compromisso_pet(id_pet, id_compromisso):
    
    query_compromisso = """SELECT id_compromisso
                           FROM compromissos
                           WHERE id_compromisso = %s AND id_pet = %s"""
    compromisso = consultar_db(query_compromisso, (id_compromisso, id_pet), one=True)

    if not compromisso:
        return jsonify({"error": "Compromisso nao encontrado ou nao pertence ao pet."}), 404
    
    query_delete = """DELETE FROM compromissos
                      WHERE id_compromisso = %s AND id_pet = %s"""
    _, error = executar_db(query_delete, (id_compromisso, id_pet))

    if error:
        return jsonify ({"error": f"Erro ao deletar o compromisso: {error}"}), 500
    
    return jsonify({"message": "Compromisso deletado com sucesso."}), 200


# ------------------------------------------------ Rotas Relatórios ------------------------------------------------

@app.route('/api/tutores/<int:id_tutor>/despesas', methods=['GET'])
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


# ------------------------------------------------ Rotas Autenticação e Segurança ------------------------------------------------

@app.route('/api/tutores/esqueci-senha', methods=['POST'])
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
                sender=app.config['MAIL_USERNAME'],
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
            #return jsonify({"error": f"Erro ao enviar email de redefinicao: {str(e)}"}), 500
        pass
        
    return jsonify({"message": "Se o email estiver cadastrado, um link de redefinicao foi enviado."}), 200


@app.route('/api/tutores/redefinir-senha', methods=['POST'])
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

@app.route('/api/tutores/<int:id_tutor>/alterar-senha', methods=['PUT'])
def alterar_senha(id_tutor):
    dados = request.json
    senha_atual = dados.get('senha_atual')
    nova_senha = dados.get('nova_senha')

    if not senha_atual or not nova_senha:
        return jsonify({"error": "Senha atual e nova senha são obrigatórias"}), 400

    # 1. Buscar a senha criptografada no banco (Corrigido '?' para '%s')
    query_busca = "SELECT senha FROM tutores WHERE id_tutor = %s"
    tutor = consultar_db(query_busca, (id_tutor,), one=True)
    
    if not tutor:
        return jsonify({"error": "Tutor não encontrado"}), 404
    
    # 2. Verificar se a 'Senha Atual' está correta usando BCRYPT
    senha_hash_banco = tutor['senha']

    # Garante que o hash do banco esteja em bytes
    if isinstance(senha_hash_banco, str):
        senha_hash_banco = senha_hash_banco.encode('utf-8')

    # Verifica a senha fornecida (convertida para bytes) contra o hash
    if not bcrypt.checkpw(senha_atual.encode('utf-8'), senha_hash_banco):
        return jsonify({"error": "A senha atual está incorreta."}), 401

    # 3. Gerar o hash da nova senha com BCRYPT
    nova_senha_hash = bcrypt.hashpw(nova_senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # 4. Atualizar no banco (Corrigido '?' para '%s')
    query_update = "UPDATE tutores SET senha = %s WHERE id_tutor = %s"
    _, error = executar_db(query_update, (nova_senha_hash, id_tutor))

    if error:
        return jsonify({"error": f"Erro ao atualizar senha: {error}"}), 500

    return jsonify({"message": "Senha alterada com sucesso!"}), 200

@app.route('/api/tutores/<int:id_tutor>/alterar-email', methods=['PUT'])
def alterar_email(id_tutor):
    dados = request.json
    novo_email = dados.get('novo_email')
    senha_atual = dados.get('senha_atual') # Pedir senha para confirmar é boa prática

    if not novo_email or not senha_atual:
        return jsonify({"error": "Novo email e senha atual são obrigatórios"}), 400

    # 1. Verificar senha
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


# Rodando a aplicação
if __name__ == '__main__':
    app.run(debug=True)

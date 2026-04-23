from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from app.database import consultar_db, executar_db
from app.utils import allowed_file, criar_evento_e_enviar_alerta

saude_bp = Blueprint('saude', __name__)

# -------- VACINAS --------
@saude_bp.route('/api/pets/<int:id_pet>/vacinas', methods=['GET'])
def get_vacinas_por_pet(id_pet):
    query = """
        SELECT v.*, vet.nome as nome_veterinario 
        FROM vacinas v
        LEFT JOIN veterinarios vet ON v.id_veterinario = vet.id_veterinario
        WHERE v.id_pet = %s
    """
    vacinas = consultar_db(query, (id_pet,))

    for vacina in vacinas:
        if 'data_vacinacao' in vacina and vacina['data_vacinacao']:
            vacina['data_vacinacao'] = vacina['data_vacinacao'].isoformat()
        
        if 'proxima_dose' in vacina and vacina['proxima_dose']:
            vacina['proxima_dose'] = vacina['proxima_dose'].isoformat()

    return jsonify(vacinas), 200


@saude_bp.route('/api/pets/<int:id_pet>/nova-vacina', methods=['POST'])
def adicionar_vacina_por_pet(id_pet):
    dados = request.json
    nome_vacina = dados.get('nome_vacina')
    lote = dados.get('lote')
    data_vacinacao = dados.get('data_vacinacao')
    id_veterinario = dados.get('id_veterinario')
    proxima_dose = dados.get('proxima_dose')
    preco_vacina = dados.get('preco_vacina')
    local_aplicacao = dados.get('local_aplicacao')
    observacoes = dados.get('observacoes')
    id_clinica = dados.get('id_clinica')

    id_vet_val = int(dados.get('id_veterinario')) if dados.get('id_veterinario') else None
    id_clinica_val = int(id_clinica) if id_clinica else None

    if not all([nome_vacina, data_vacinacao, proxima_dose, local_aplicacao]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400
    
    if proxima_dose < data_vacinacao:
        return jsonify({"error": "A data da próxima dose deve ser posterior à data de vacinação."}), 400

    enviar_notificacao = dados.get('enviar_notificacao', True)

    query = """INSERT INTO vacinas (id_pet, nome_vacina, lote, data_vacinacao, id_veterinario, proxima_dose, preco_vacina, local_aplicacao, observacoes, id_clinica) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    _, error = executar_db(query, (id_pet, nome_vacina, lote, data_vacinacao, id_vet_val, proxima_dose, preco_vacina, local_aplicacao, observacoes, id_clinica_val))

    if error:
        return jsonify({"error": f"Erro ao adicionar vacina: {error}"}), 500    

    print(f"Proxima dose recebida: {proxima_dose}, enviar_notificacao: {enviar_notificacao}")

    if proxima_dose and enviar_notificacao:
        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=f"Proxima dose da vacina {dados.get('nome_vacina')}",
            data_evento=proxima_dose,
            descricao=f"Lembrete para a proxima dose da vacina {dados.get('nome_vacina')}."
        )
    
    return jsonify({"message": "Vacina adicionada com sucesso."}), 201


@saude_bp.route('/api/pets/<int:id_pet>/deletar-vacina/<int:id_vacina>', methods=['DELETE'])
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
        return jsonify({"message": "Nenhuma vacina encontrada"}),
    

    return jsonify({"message": "Vacina deletada com sucesso."}), 200


@saude_bp.route('/api/pets/<int:id_pet>/editar-vacina/<int:id_vacina>', methods=['PUT'])
def editar_vacina(id_pet, id_vacina):

    dados = request.json
    nome_vacina = dados.get('nome_vacina')
    lote = dados.get('lote')
    data_vacinacao = dados.get('data_vacinacao')
    id_veterinario = dados.get('id_veterinario')
    proxima_dose = dados.get('proxima_dose')
    preco_vacina = dados.get('preco_vacina')
    local_aplicacao = dados.get('local_aplicacao')
    observacoes = dados.get('observacoes')
    id_clinica = dados.get('id_clinica')

    id_vet_val = int(dados.get('id_veterinario')) if dados.get('id_veterinario') else None
    id_clinica_val = int(id_clinica) if id_clinica else None

    enviar_notificacao = dados.get('enviar_notificacao', True)

    if proxima_dose and proxima_dose < data_vacinacao:
        return jsonify({"error": "A data da próxima dose deve ser posterior à data de vacinação."}), 400

    query = """UPDATE vacinas 
               SET nome_vacina = %s, lote = %s, data_vacinacao = %s, id_veterinario = %s, proxima_dose = %s, preco_vacina = %s, local_aplicacao = %s, observacoes = %s, id_clinica = %s
               WHERE id_pet = %s AND id_vacina = %s"""
    _, error = executar_db(query, (nome_vacina, lote, data_vacinacao, id_vet_val, proxima_dose, preco_vacina, local_aplicacao, observacoes, id_clinica_val, id_pet, id_vacina))
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

# -------- CONSULTAS --------

@saude_bp.route('/api/pets/<int:id_pet>/consultas', methods=['GET'])
def consultas_pet(id_pet):
    query = """
        SELECT 
            c.id_consulta, 
            c.id_pet, 
            c.data_consulta, 
            c.hora, 
            c.motivo, 
            c.id_clinica, 
            c.id_veterinario,
            cl.nome_clinica, 
            vet.nome as nome_veterinario 
        FROM consultas c
        LEFT JOIN clinicas_veterinarias cl ON c.id_clinica = cl.id_clinica
        LEFT JOIN veterinarios vet ON c.id_veterinario = vet.id_veterinario
        WHERE c.id_pet = %s
    """
    consultas = consultar_db(query, (id_pet,))

    for consulta in consultas:
        if 'data_consulta' in consulta and consulta['data_consulta'] is not None:
            consulta['data_consulta'] = consulta['data_consulta'].isoformat()
        if 'hora' in consulta and consulta['hora'] is not None:
            consulta['hora'] = consulta['hora'].strftime('%H:%M:%S')

    return jsonify(consultas), 200


@saude_bp.route('/api/pets/<int:id_pet>/nova-consulta', methods=['POST'])
def criar_consulta_pet(id_pet):
    dados = request.json
    data_consulta = dados.get('data_consulta')
    hora = dados.get('hora')
    motivo = dados.get('motivo')
    id_clinica = int(dados.get('id_clinica')) if dados.get('id_clinica') else None
    id_veterinario = int(dados.get('id_veterinario')) if dados.get('id_veterinario') else None

    if not all([data_consulta, hora, motivo, id_veterinario]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400  
    
    query = """INSERT INTO consultas (id_pet, data_consulta, hora, motivo, id_clinica, id_veterinario) 
               VALUES (%s, %s, %s, %s, %s, %s)"""
    _, error = executar_db(query, (id_pet, data_consulta, hora, motivo, id_clinica, id_veterinario))  

    if error:
        return jsonify({"error": f"Erro ao criar consulta: {error}"}), 500
    
    criar_evento_e_enviar_alerta(
        id_pet=id_pet,
        titulo=f"Consulta agendada: {motivo}",
        data_evento=data_consulta,
        hora_evento=hora,
        descricao=f"Lembrete para a consulta de {motivo} no dia {data_consulta} às {hora}."
    )

    return jsonify({"message": "Consulta criada com sucesso."}), 201


@saude_bp.route('/api/pets/<int:id_pet>/editar-consulta/<int:id_consulta>', methods=['PUT'])
def editar_consulta_pet(id_pet, id_consulta):
    dados = request.json
    data_consulta = dados.get('data_consulta')
    hora = dados.get('hora')
    motivo = dados.get('motivo')

    id_clinica = int(dados.get('id_clinica')) if dados.get('id_clinica') else None
    id_veterinario = int(dados.get('id_veterinario')) if dados.get('id_veterinario') else None

    query = """UPDATE consultas 
               SET data_consulta = %s, hora = %s, motivo = %s, id_clinica = %s, id_veterinario = %s
               WHERE id_pet = %s AND id_consulta = %s"""
    _, error = executar_db(query, (data_consulta, hora, motivo, id_clinica, id_veterinario, id_pet, id_consulta))

    if error:
        print(f">>> [ERRO DB EDITAR CONSULTA]: {error}")
        return jsonify({"error": f"Erro ao editar consulta: {error}"}), 500
    
    return jsonify({"message": "Consulta atualizado com sucesso."}), 200


@saude_bp.route('/api/pets/<int:id_pet>/deletar-consulta/<int:id_consulta>', methods=['DELETE'])
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

@saude_bp.route('/api/pets/<int:id_pet>/consultas/semana', methods=['GET'])
def consultas_da_semana(id_pet):
    query = """SELECT c.*, cl.nome_clinica, vet.nome as nome_veterinario 
               FROM consultas c
               LEFT JOIN clinicas_veterinarias cl ON c.id_clinica = cl.id_clinica
               LEFT JOIN veterinarios vet ON c.id_veterinario = vet.id_veterinario
               WHERE c.id_pet = %s 
               AND c.data_consulta >= CURRENT_DATE 
               AND c.data_consulta <= CURRENT_DATE + INTERVAL '7 days'
               ORDER BY c.data_consulta ASC, c.hora ASC"""
    
    consultas = consultar_db(query, (id_pet,))

    print(f"\n>>> [BACKEND] Consultas da semana para o pet {id_pet}: {len(consultas)} encontradas.")
    for c in consultas:
        print(f"    - ID: {c.get('id_consulta')} | Data: {c.get('data_consulta')} | Motivo: {c.get('motivo')}")

    for consulta in consultas:
        if consulta.get('data_consulta'):
            consulta['data_consulta'] = consulta['data_consulta'].isoformat()
        if consulta.get('hora'):
            consulta['hora'] = consulta['hora'].strftime('%H:%M')

    return jsonify(consultas), 200

@saude_bp.route('/api/pets/consultas/<int:id_consulta>/anexar-arquivo', methods=['POST'])
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
    






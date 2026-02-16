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


@saude_bp.route('/api/pets/<int:id_pet>/nova-vacina', methods=['POST'])
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

# -------- CONSULTAS --------

@saude_bp.route('/api/pets/<int:id_pet>/consultas', methods=['GET'])
def consultas_pet(id_pet):
    query = "SELECT * " \
    "        FROM consultas " \
    "        WHERE id_pet = %s"
    consultas = consultar_db(query, (id_pet,))

    for consulta in consultas:
        if 'hora' in consulta and consulta['hora'] is not None:
            consulta['hora'] = consulta['hora'].strftime('%H:%M:%S')

    return jsonify(consultas), 200


@saude_bp.route('/api/pets/<int:id_pet>/nova-consulta', methods=['POST'])
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


@saude_bp.route('/api/pets/<int:id_pet>/editar-consulta/<int:id_consulta>', methods=['PUT'])
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
    

# -------- REMÉDIOS --------

@saude_bp.route('/api/pets/<int:id_pet>/remedios', methods=['GET'])
def remedios_por_pet(id_pet):
    query = "SELECT * FROM remedios WHERE id_pet = %s"
    remedios = consultar_db(query, (id_pet,))
    return jsonify(remedios), 200


@saude_bp.route('/api/pets/<int:id_pet>/novo-remedio', methods=['POST'])
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
        pet = consultar_db(query_pet, (id_pet,), one=True)
        nome_pet = pet['nome_pet'] if pet else "seu pet"

        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=f"Proxima dose do remedio {dados.get('nome_remedio')}",
            data_evento=proxima_dose,
            descricao=f"Lembrete para a proxima dose do remedio {dados.get('nome_remedio')} para {nome_pet}."
        )

    return jsonify({"message": "Remedio criado com sucesso."}), 201


@saude_bp.route('/api/pets/<int:id_pet>/editar-remedio/<int:id_remedio>', methods=['PUT'])
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
        pet = consultar_db(query_pet, (id_pet,), one=True) 
        nome_pet = pet['nome_pet'] if pet else "seu pet"

        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=f"Proxima dose do remedio {dados.get('nome_remedio')} foi atualizada!",
            data_evento=proxima_dose_nova,
            descricao=f"Lembrete para a proxima dose do remédio {dados.get('nome_remedio')} para {nome_pet}."
        )

    return jsonify({"message": "Remedio atualizado com sucesso."}), 200


@saude_bp.route('/api/pets/<int:id_pet>/deletar-remedio/<int:id_remedio>', methods=['DELETE'])
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

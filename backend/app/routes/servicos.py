from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from app.database import consultar_db, executar_db
from app.utils import criar_evento_e_enviar_alerta

servicos_bp = Blueprint('servicos', __name__)

# --- CLÍNICAS ---
# Inclua: listar_clinicas, criar_clinica, editar_clinica, deletar_clinica

@servicos_bp.route('/api/clinicas', methods=['GET'])
def listar_clinicas():
    query = "SELECT * " \
    "        FROM clinicas_veterinarias"
    clinicas = consultar_db(query)
    return jsonify(clinicas), 200


@servicos_bp.route('/api/nova-clinica', methods=['POST'])
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


@servicos_bp.route('/api/clinica/<int:id_clinica>', methods=['PUT'])
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


@servicos_bp.route('/api/clinica/<int:id_clinica>', methods=['DELETE'])
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

# --- PRODUTOS ---
# Inclua: produtos_por_pet, criar_produto_pet, editar_produto, registrar_consumo_produto, deletar_produto

@servicos_bp.route('/api/pets/<int:id_pet>/produtos', methods=['GET'])
def produtos_por_pet(id_pet):
    query = "SELECT * " \
    "        FROM produtos " \
    "        WHERE id_pet = %s"
    produtos = consultar_db(query, (id_pet,))

    for produto in produtos:
        if 'data_compra' in produto and produto['data_compra']:
            produto['data_compra'] = produto['data_compra'].isoformat()

    return jsonify(produtos), 200


@servicos_bp.route('/api/pets/<int:id_pet>/novo-produto', methods=['POST'])
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


@servicos_bp.route('/api/pets/<int:id_pet>/produtos/<int:id_compra>', methods=['PUT'])
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


@servicos_bp.route('/api/pets/<int:id_pet>/produtos/<int:id_compra>/consumo', methods=['POST'])
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


@servicos_bp.route('/api/pets/<int:id_pet>/produtos/<int:id_compra>', methods=['DELETE'])
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


# --- COMPROMISSOS ---
# Inclua: compromissos_por_pet, agendar_compromisso_pet, editar_compromisso_pet, deletar_compromisso_pet

@servicos_bp.route('/api/pets/<int:id_pet>/compromissos', methods=['GET'])
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


@servicos_bp.route('/api/pets/<int:id_pet>/agendar-compromissos', methods=['POST'])
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


@servicos_bp.route('/api/pets/<int:id_pet>/compromissos/<int:id_compromisso>', methods=['PUT'])
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


@servicos_bp.route('/api/pets/<int:id_pet>/compromissos/<int:id_compromisso>', methods=['DELETE'])
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
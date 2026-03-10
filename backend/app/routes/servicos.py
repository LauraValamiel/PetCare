from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from app.database import consultar_db, executar_db
from app.utils import criar_evento_e_enviar_alerta

servicos_bp = Blueprint('servicos', __name__)

@servicos_bp.route('/api/fix-tabela', methods=['GET'])
def fix_tabela():
    comandos = [
       "ALTER TABLE consultas ADD COLUMN id_veterinario INT REFERENCES veterinarios(id_veterinario) ON DELETE SET NULL",
        "ALTER TABLE vacinas ADD COLUMN id_veterinario INT REFERENCES veterinarios(id_veterinario) ON DELETE SET NULL",
        "ALTER TABLE vacinas DROP COLUMN nome_veterinario"
    ]

    erros = []
    
    for query in comandos:
        # Executa cada comando individualmente
        _, error = executar_db(query)
        if error:
            print(f"Erro ao executar: {query} -> {error}")
            erros.append(f"Erro no comando '{query}': {error}")
            
    if erros:
        return jsonify({"error": "Houve erros ao atualizar a tabela", "detalhes": erros}), 500
        
    return jsonify({"message": "Sucesso! Tabelas atualizadas com as colunas de relacionamento e notificações."}), 200


# -------- CLÍNICAS --------

@servicos_bp.route('/api/tutores/<int:id_tutor>/clinicas', methods=['GET'])
def listar_clinicas(id_tutor):
    query = "SELECT * " \
    "        FROM clinicas_veterinarias " \
    "        WHERE id_tutor = %s"
    clinicas = consultar_db(query, (id_tutor,))
    return jsonify(clinicas), 200


@servicos_bp.route('/api/tutores/<int:id_tutor>/nova-clinica', methods=['POST'])
def criar_clinica(id_tutor):
    dados = request.json
    nome_clinica = dados.get('nome_clinica')
    endereco = dados.get('endereco')
    telefone = dados.get('telefone')


    if not all([nome_clinica, endereco, telefone]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400
    
    query = """INSERT INTO clinicas_veterinarias (id_tutor, nome_clinica, endereco, telefone)
               VALUES (%s, %s, %s, %s)"""
    _, error = executar_db(query, (id_tutor, nome_clinica, endereco, telefone))
    if error:
        return jsonify({"error": f"Erro ao criar clinica: {error}"}), 500
    
    return jsonify({"message": "Clinica criada com sucesso."}), 201


@servicos_bp.route('/api/clinica/<int:id_clinica>', methods=['PUT'])
def editar_clinica(id_clinica):
    dados = request.json
    nome_clinica = dados.get('nome_clinica')
    endereco = dados.get('endereco')
    telefone = dados.get('telefone')

    if not all([nome_clinica, endereco, telefone]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400
    
    query = """UPDATE clinicas_veterinarias 
               SET nome_clinica = %s, endereco = %s, telefone = %s
               WHERE id_clinica = %s"""
    _, error = executar_db(query, (nome_clinica, endereco, telefone, id_clinica))

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

# -------- VETERINÁRIOS --------

@servicos_bp.route('/api/tutores/<int:id_tutor>/veterinarios', methods=['GET', 'OPTIONS'])
def listar_veterinarios_do_tutor(id_tutor):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    query = """
        SELECT v.*, c.nome_clinica 
        FROM veterinarios v
        LEFT JOIN clinicas_veterinarias c ON v.id_clinica = c.id_clinica
        WHERE v.id_tutor = %s
    """
    veterinarios = consultar_db(query, (id_tutor,))
    return jsonify(veterinarios), 200

@servicos_bp.route('/api/clinica/<int:id_clinica>/veterinarios', methods=['GET'])
def listar_veterinarios_da_clinica(id_clinica):
    query = """
        SELECT v.*, c.nome_clinica 
        FROM veterinarios v
        LEFT JOIN clinicas_veterinarias c ON v.id_clinica = c.id_clinica
        WHERE v.id_clinica = %s
    """
    veterinarios = consultar_db(query, (id_clinica,))
    return jsonify(veterinarios), 200

@servicos_bp.route('/api/tutores/<int:id_tutor>/novo-veterinario', methods=['POST', 'OPTIONS'])
def criar_veterinario_independente(id_tutor):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    dados = request.json
    nome = dados.get('nome')
    especialidade = dados.get('especialidade', '')
    telefone = dados.get('telefone', '')
    id_clinica = dados.get('id_clinica')

    if not nome:
        return jsonify({"error": "O nome do veterinário é obrigatório."}), 400
    
    query = """INSERT INTO veterinarios (id_tutor, id_clinica, nome, especialidade, telefone)
               VALUES (%s, %s, %s, %s, %s)"""
               
    clinica_val = id_clinica if id_clinica else None
    
    _, error = executar_db(query, (id_tutor, clinica_val, nome, especialidade, telefone))
    
    if error:
        return jsonify({"error": f"Erro ao cadastrar veterinário: {error}"}), 500
    
    return jsonify({"message": "Veterinário cadastrado com sucesso."}), 201

@servicos_bp.route('/api/veterinario/<int:id_veterinario>', methods=['PUT', 'OPTIONS'])
def editar_veterinario(id_veterinario):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    dados = request.json
    nome = dados.get('nome')
    especialidade = dados.get('especialidade', '')
    telefone = dados.get('telefone', '')
    id_clinica = dados.get('id_clinica') 

    if not nome:
        return jsonify({"error": "O nome do veterinário é obrigatório."}), 400
    
    clinica_val = id_clinica if id_clinica else None

    query = """UPDATE veterinarios 
               SET nome = %s, especialidade = %s, telefone = %s, id_clinica = %s
               WHERE id_veterinario = %s"""
    _, error = executar_db(query, (nome, especialidade, telefone, clinica_val, id_veterinario))

    if error:
        return jsonify({"error": f"Erro ao atualizar veterinário: {error}"}), 500
    
    return jsonify({"message": "Veterinário atualizado com sucesso."}), 200

@servicos_bp.route('/api/veterinario/<int:id_veterinario>', methods=['DELETE', 'OPTIONS'])
def deletar_veterinario(id_veterinario):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    query_vet = "SELECT id_veterinario FROM veterinarios WHERE id_veterinario = %s"
    vet = consultar_db(query_vet, (id_veterinario, ), one=True)
    
    if not vet:
        return jsonify({"error": "Veterinário não encontrado."}), 404
    
    query_delete = "DELETE FROM veterinarios WHERE id_veterinario = %s"
    _, error = executar_db(query_delete, (id_veterinario,))

    if error:
        return jsonify({"error": "Erro ao deletar veterinário."}), 500
    
    return jsonify({"message": "Veterinário deletado com sucesso."}), 200

# -------- PRODUTOS --------

@servicos_bp.route('/api/pets/<int:id_pet>/produtos', methods=['GET'])
def produtos_por_pet(id_pet):
    query = "SELECT * " \
    "        FROM produtos " \
    "        WHERE id_pet = %s"
    produtos = consultar_db(query, (id_pet,))

    for produto in produtos:
        if 'data_compra' in produto and produto['data_compra']:
            produto['data_compra'] = produto['data_compra'].isoformat()
        if 'data_validade' in produto and produto['data_validade']:
            produto['data_validade'] = produto['data_validade'].isoformat()

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
    data_validade = dados.get('data_validade')

    enviar_notificacao = dados.get('enviar_notificacao', True)

    print(f"\n[DEBUG POST] Criando produto: {nome_produto}")
    print(f"[DEBUG POST] Data Validade recebida: {data_validade}")
    print(f"[DEBUG POST] Notificações ativas: {enviar_notificacao}")

    if not all([nome_produto, categoria, quantidade, consumo_medio, data_compra, preco_compra, loja, data_validade]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400
    
    query = """INSERT INTO produtos (id_pet, nome_produto, categoria, quantidade, consumo_medio, data_compra, preco_compra, loja, observacoes, consumo_periodo, data_validade)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    _, error = executar_db(query, (id_pet, nome_produto, categoria, quantidade, consumo_medio, data_compra, preco_compra, loja, observacoes, consumo_periodo, data_validade))

    if error:
        print(f"[DEBUG POST] Erro no banco: {error}")
        return jsonify({"error": f"Erro ao criar produto: {error}"}), 500
    
    if enviar_notificacao:
        hoje = datetime.now()
        if quantidade > 0 and consumo_medio > 0:
            dias_duracao = quantidade / consumo_medio
            antecedencia = 5 if dias_duracao > 10 else 1
            data_alerta_estoque = hoje + timedelta(days=max(0, dias_duracao - antecedencia))
            if data_alerta_estoque >  hoje:
                criar_evento_e_enviar_alerta(id_pet=id_pet, titulo=f"Estoque acabando: {nome_produto}", data_evento=data_alerta_estoque.strftime('%Y-%m-%d'), descricao=f"O produto {nome_produto} deve acabar em breve.")

        if data_validade:
            validade_dt = datetime.strptime(data_validade, '%Y-%m-%d')
            data_alerta_validade = validade_dt - timedelta(days=7)
        
            print(f"[DEBUG POST] Calculando janela de e-mail. Hoje: {hoje}, Validade: {validade_dt}")

            if hoje < validade_dt <= (hoje + timedelta(days=7)) and data_alerta_validade >= hoje:
                data_evento_envio = hoje.strftime('%Y-%m-%d')
                print("[DEBUG POST] CONDIÇÃO ACEITA: Chamando criar_evento_e_enviar_alerta...")
                
                criar_evento_e_enviar_alerta(
                    id_pet=id_pet,
                    titulo=f"Validade próxima: {nome_produto}",
                    data_evento=data_evento_envio,
                    descricao=f"O produto {nome_produto} vencerá no dia {data_validade}. Verifique a qualidade antes do uso."
                )
            else:
                print(f"[DEBUG POST] FORA DA JANELA: O produto vence em mais de 7 dias ou já venceu.")
   
    
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
    data_validade = dados.get('data_validade')

    enviar_notificacao = dados.get('enviar_notificacao', True)

    print(f"\n[DEBUG POST] Editando produto: {nome_produto}")
    print(f"[DEBUG POST] Data Validade recebida: {data_validade}")
    print(f"[DEBUG POST] Notificações ativas: {enviar_notificacao}")

    query = """UPDATE produtos 
               SET nome_produto = %s, categoria = %s, quantidade = %s, consumo_medio = %s, data_compra = %s, preco_compra = %s, loja = %s, observacoes = %s, consumo_periodo = %s, data_validade = %s
               WHERE id_compra = %s AND id_pet = %s"""
    _, error = executar_db(query, (nome_produto, categoria, quantidade, consumo_medio, data_compra, preco_compra, loja, observacoes, consumo_periodo, data_validade, id_compra, id_pet))

    if error:
        return jsonify({"error": f"Erro ao atualizar produto: {error}"}), 500

    
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

    if enviar_notificacao and data_validade:
        validade_dt = datetime.strptime(data_validade, '%Y-%m-%d')
        hoje = datetime.now()
        print(f"[DEBUG POST] Calculando janela de e-mail. Hoje: {hoje}, Validade: {validade_dt}")

        if hoje < validade_dt <= (hoje + timedelta(days=7)):
            data_evento_envio = hoje.strftime('%Y-%m-%d')
            print("[DEBUG POST] CONDIÇÃO ACEITA: Chamando criar_evento_e_enviar_alerta...")
            criar_evento_e_enviar_alerta(
                id_pet=id_pet,
                titulo=f"Lembrete de Validade: {nome_produto}",
                data_evento=data_evento_envio,
                descricao=f"O produto {nome_produto} está chegando próximo ao vencimento ({data_validade})."
            )
        else:
            print(f"[DEBUG POST] FORA DA JANELA: O produto vence em mais de 7 dias ou já venceu.")

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


# -------- COMPROMISSOS --------

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
    descricao = dados.get('descricao', '')
    data_compromisso = dados.get('data_compromisso')
    hora = dados.get('hora')
    localizacao = dados.get('localizacao')
    lembrete = dados.get('lembrete', False)
    criado_em = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not all([titulo, data_compromisso, hora, localizacao]):
        return jsonify({"error": "Todos os campos obrigatorios devem ser preenchidos."}), 400

    enviar_notificacao = dados.get('enviar_notificacao', True)

    query = """INSERT INTO compromissos (id_pet, titulo, descricao, data_compromisso, hora, localizacao, lembrete, criado_em)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
    _, error = executar_db(query, (id_pet, titulo, descricao, data_compromisso, hora, localizacao, lembrete, criado_em))
    if error:
        return jsonify({"error": f"Erro ao agendar compromisso: {error}"}), 500
    
    print(f"Compromisso a ser agendado: {titulo} em {data_compromisso} às {hora} para o pet {id_pet}. Lembrete: {lembrete}, Enviar Notificação: {enviar_notificacao}")

    if lembrete and data_compromisso and enviar_notificacao:
        texto_descricao = descricao if descricao else f"Lembrete para {titulo} no dia {data_compromisso} às {hora} em {localizacao}."
        print(f"Criando evento para compromisso: {titulo} em {data_compromisso} às {hora} para o pet {id_pet}.")
        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=dados.get('titulo'),
            data_evento=data_compromisso,
            hora_evento=hora,
            descricao=texto_descricao
        )
    
    print(f"Compromisso agendado com sucesso para o pet {id_pet}. Enviar Notificação: {enviar_notificacao}")

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
        texto_descricao = descricao if descricao else f"Lembrete para {titulo} no dia {data_compromisso} às {hora} em {localizacao}."
        criar_evento_e_enviar_alerta(
            id_pet=id_pet,
            titulo=f"Compromisso atualizado: {titulo}",
            data_evento=data_compromisso,
            hora_evento=hora,
            descricao=texto_descricao
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
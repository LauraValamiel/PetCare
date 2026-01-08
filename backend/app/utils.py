from datetime import datetime, timedelta, time as time_obj
from urllib.parse import quote_plus
from flask import jsonify
from flask_mail import Message
from app.extensions import mail
from app.database import consultar_db

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def criar_evento_e_enviar_alerta(id_pet, titulo, data_evento, hora_evento=None, descricao=''):
    pet = consultar_db("SELECT nome_pet FROM pets WHERE id_pet = %s", (id_pet,), one=True)
    if not pet:
        return jsonify({"error": "Alerta nao enviado, pet nao encontrado"}), 404
    
    query_tutores = """ SELECT t.email FROM tutores t 
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
        elif isinstance(data_evento, datetime.date): # Correção para verificar tipo datetime.date
            data_evento_obj = data_evento
        # ... (restante da lógica de data igual ao original) ...
        
        # Simplificando para brevidade, mas mantenha sua lógica de formatação de hora aqui:
        hora_evento_obj = None
        if hora_evento:
             if isinstance(hora_evento, str):
                hora_limpa = hora_evento.split('.')[0].upper().replace('Z', '')
                for fmt in ('%H:%M:%S', '%H:%M'):
                    try:
                        hora_evento_obj = datetime.strptime(hora_limpa, fmt).time()
                        break
                    except ValueError: continue
             elif isinstance(hora_evento, time_obj):
                hora_evento_obj = hora_evento

        if hora_evento_obj:
            data_inicio = datetime.combine(data_evento_obj, hora_evento_obj)
            data_fim = data_inicio + timedelta(hours=1)
            datas_formatadas = f"{data_inicio.strftime('%Y%m%dT%H%M%S')}/{data_fim.strftime('%Y%m%dT%H%M%S')}"
            data_email_formatada = data_inicio.strftime('%d/%m/%Y às %H:%M')
        else:
            data_inicio = data_evento_obj
            data_fim = data_evento_obj + timedelta(days=1)
            datas_formatadas = f"{data_inicio.strftime('%Y%m%d')}/{data_fim.strftime('%Y%m%d')}"
            data_email_formatada = data_inicio.strftime('%d/%m/%Y')

        base_url = "https://www.google.com/calendar/render?action=TEMPLATE"
        link_agenda = f"{base_url}&text={quote_plus(titulo_completo)}&dates={datas_formatadas}&details={quote_plus(descricao)}"

        msg = Message(subject=f"Lembrete PetCare: {titulo_completo}", recipients=destinatarios)
        msg.html = f"""
            <p>Olá,</p>
            <p>Este é um lembrete sobre um compromisso importante para <strong>{nome_pet}</strong>:</p>
            <p><strong>Evento:</strong> {titulo}</p>
            <p><strong>Data:</strong> {data_email_formatada}</p>
            <p><a href="{link_agenda}">Adicionar à Agenda Google</a></p>
            <p>Atenciosamente,<br>Equipe PetCare</p>
        """
        mail.send(msg)
        print(f"Email de alerta enviado com sucesso para: {destinatarios}.")

    except Exception as e:
        print(f"Erro ao enviar email de alerta: {e}")
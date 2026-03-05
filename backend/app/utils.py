import datetime as dt
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
    print(f"---PREPARANDO EMAIL PARA: {titulo}---")

    pet = consultar_db("SELECT nome_pet FROM pets WHERE id_pet = %s", (id_pet,), one=True)
    if not pet:
        print(f"Pet com id {id_pet} não encontrado. Alerta não enviado.")
        return
    
    query_tutores = """ SELECT t.email, t.notif_geral
                        FROM tutores t 
                        JOIN tutor_pet tp ON t.id_tutor = tp.id_tutor 
                        WHERE tp.id_pet = %s
                        """
    tutores = consultar_db(query_tutores, (id_pet,))

    if not tutores:
        print(f"Nenhum tutor encontrado para pet id {id_pet}. Alerta não enviado.")
        return
    

    destinatarios = []
    for tutor in tutores:
        notif = tutor.get('notif_geral')
        if notif is not False:
            destinatarios.append(tutor['email'])
    
    if not destinatarios:
        print(f"Nenhum tutor com notificações habilitadas para pet id {id_pet}. Alerta não enviado.")
        return 
    
    print(f"-> Destinatários encontrados: {destinatarios}")

    nome_pet = pet['nome_pet']
    titulo_completo = f"Alerta para {nome_pet}: {titulo}"

    try:
        print("data_evento recebida:", data_evento, type(data_evento))

        if isinstance(data_evento, str):
            try:
                # Se vier datetime completo
                if "T" in data_evento:
                    data_evento_obj = dt.datetime.fromisoformat(data_evento.replace("Z", ""))
                else:
                    # Se vier só data (YYYY-MM-DD)
                    data_evento_obj = dt.datetime.strptime(data_evento, "%Y-%m-%d")
            except Exception as e:
                print("Erro ao converter data_evento:", e)
                return

        elif isinstance(data_evento, dt.datetime):
            data_evento_obj = data_evento

        elif isinstance(data_evento, dt.date):
            data_evento_obj = dt.datetime.combine(data_evento, dt.time.min)
        else:
            print("Formato de data inválido")
            return
        
        
       
        if hora_evento:
            if isinstance(hora_evento, str):
                hora_obj = dt.datetime.strptime(hora_evento[:5], "%H:%M").time()
            elif isinstance(hora_evento, dt.time):
                hora_obj = hora_evento
            else:
                hora_obj = None

            if hora_obj:
                data_evento_obj = data_evento_obj.replace(
                    hour=hora_obj.hour,
                    minute=hora_obj.minute
                )

        print("data_evento_obj final:", data_evento_obj)

        print("ANTES DO STRFTIME:", data_evento_obj)
        data_email_formatada = data_evento_obj.strftime("%d/%m/%Y - %H:%M")
        print("DEPOIS DO STRFTIME:", data_email_formatada)

        data_inicio = data_evento_obj
        data_fim = data_inicio + dt.timedelta(hours=1)
        datas_formatadas = f"{data_inicio.strftime('%Y%m%dT%H%M%S')}/{data_fim.strftime('%Y%m%dT%H%M%S')}"

        print(f"Data final formatada: {data_email_formatada}")
        print(f"Datas para link do Google Agenda: {datas_formatadas}")
        
        base_url = "https://www.google.com/calendar/render?action=TEMPLATE"
        link_agenda = f"{base_url}&text={quote_plus(titulo_completo)}&dates={datas_formatadas}&details={quote_plus(descricao)}&ctz=America/Sao_Paulo"      
        assunto = f"Lembrete PetCare: {titulo_completo} - {data_email_formatada}"
        msg = Message(subject=assunto, recipients=destinatarios)
        msg.html = f"""
            <p>Olá,</p>
            <p>Este é um lembrete sobre um compromisso importante para <strong>{nome_pet}</strong>:</p>
            <p><strong>📌 Evento:</strong> {titulo}</p>
            <p><strong>📅 Data e Hora:</strong> {data_email_formatada}</p>
            <p><a href="{link_agenda}">Adicionar à Agenda Google</a></p>
            <p>Atenciosamente,<br>Equipe PetCare</p>
        """
        mail.send(msg)
        print(f"Email de alerta enviado com sucesso para: {destinatarios}.")

    except Exception as e:
        print(f"Erro ao enviar email de alerta: {e}")
    pass

    
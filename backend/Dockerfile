FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Locale pt_BR usado na formatação de datas da API.
RUN apt-get update \
    && apt-get install -y --no-install-recommends locales \
    && sed -i '/pt_BR.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Diretório das fotos enviadas pelos tutores (montado como volume).
ENV UPLOAD_FOLDER=/app/app/uploads
RUN mkdir -p /app/app/uploads

ENV PORT=5000
EXPOSE 5000

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --workers 2 --timeout 120 run:app"]

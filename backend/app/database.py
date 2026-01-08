import psycopg2
from psycopg2.extras import RealDictCursor
import os

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
        if self._connection is None or self._connection.closed != 0:
            self._connect()
        return self._connection

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
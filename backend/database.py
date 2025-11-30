import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from config import settings
import logging
import time

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY = 2  # segundos


@contextmanager
def get_db_connection(retry_count=0):
    """Context manager para conexão com banco de dados com retry"""
    conn = None
    try:
        logger.debug(
            f"[DB] Tentando conectar ao banco (tentativa {retry_count + 1}/{MAX_RETRIES})..."
        )
        conn = psycopg2.connect(
            settings.postgres_url,
            cursor_factory=RealDictCursor,
            connect_timeout=15,
            options="-c statement_timeout=600000",  # 10 minutos
        )
        logger.debug("[DB] ✅ Conexão estabelecida com sucesso")
        yield conn
    except psycopg2.OperationalError as e:
        logger.error(f"[DB] ❌ Erro operacional: {e}")
        if retry_count < MAX_RETRIES:
            logger.info(f"[DB] Retry em {RETRY_DELAY}s...")
            time.sleep(RETRY_DELAY)
            yield from get_db_connection(retry_count + 1)
        else:
            raise
    except Exception as e:
        logger.error(f"[DB] ❌ Erro inesperado ao conectar: {type(e).__name__}: {e}")
        raise
    finally:
        if conn:
            conn.close()


def execute_query(query: str, params=None):
    """Executa query e retorna resultados como lista de dicts"""
    try:
        logger.debug(f"[Query] Executando: {query[:80]}...")
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                results = cursor.fetchall()
                logger.info(f"[Query] ✅ {len(results)} linhas retornadas")
                return results
    except Exception as e:
        logger.error(f"[Query] ❌ Erro: {type(e).__name__}: {e}", exc_info=True)
        return []


def test_connection():
    """Testa se a conexão com banco está funcionando"""
    try:
        result = execute_query("SELECT 1")
        logger.info("[DB] 🔍 Teste de conexão: OK")
        return True
    except Exception as e:
        logger.error(f"[DB] 🔍 Teste de conexão: FALHOU - {e}")
        return False


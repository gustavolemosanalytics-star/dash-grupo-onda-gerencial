from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from bigquery_client import bq_client
from cache import cache
import logging
from decimal import Decimal
from datetime import datetime, date, time
import uuid
from collections.abc import Mapping, Sequence

router = APIRouter(prefix="/vendas-ingresso", tags=["Vendas de Ingresso"])
logger = logging.getLogger(__name__)


def _normalize_value(v):
    if v is None:
        return None
    if isinstance(v, Decimal):
        try:
            return float(v)
        except Exception:
            return float(str(v))
    if isinstance(v, (datetime, date, time)):
        return v.isoformat()
    if isinstance(v, uuid.UUID):
        return str(v)
    if isinstance(v, memoryview):
        try:
            return v.tobytes().decode('utf-8', errors='ignore')
        except Exception:
            return str(v.tobytes())
    if isinstance(v, bytes):
        try:
            return v.decode('utf-8', errors='ignore')
        except Exception:
            return str(v)
    if isinstance(v, Mapping):
        return {k: _normalize_value(val) for k, val in v.items()}
    if isinstance(v, Sequence) and not isinstance(v, (str, bytes, bytearray)):
        return [_normalize_value(i) for i in v]
    return v

def _normalize_rows(rows):
    if not rows:
        return []
    normalized = []
    for row in rows:
        # row pode ser dict-like, namedtuple, Record, etc.
        if isinstance(row, Mapping):
            items = row.items()
        elif hasattr(row, "_asdict"):
            items = row._asdict().items()
        else:
            try:
                items = dict(row).items()
            except Exception:
                try:
                    items = vars(row).items()
                except Exception:
                    normalized.append({"_raw": str(row)})
                    continue

        d = {}
        for k, v in items:
            d[k] = _normalize_value(v)
        normalized.append(d)
    return normalized


@router.get("/", response_model=List[Dict[str, Any]])
async def get_vendas_ingresso(limit: int = 100000):
    """Retorna dados de vendas de ingresso do BigQuery"""
    cache_key = f"vendas_data_{limit}"

    # Tenta buscar do cache
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        logger.info(f"[Vendas Ingresso] Retornando {len(cached_data)} registros do cache")
        return cached_data

    try:
        logger.info(f"[Vendas] Carregando dados do BigQuery")
        data = bq_client.get_vendas_ingresso(limit=limit)

        if not data:
            logger.warning("[Vendas] ⚠️  Nenhum dado retornado!")
            return []

        logger.info(f"[Vendas] ✅ Retornou {len(data)} registros")

        # Armazena no cache por 10 minutos
        cache.set(cache_key, data, ttl_minutes=10)

        return data
    except Exception as e:
        logger.error(f"[Vendas] ❌ Erro ao buscar dados: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=Dict[str, Any])
async def get_vendas_stats():
    """Retorna estatísticas agregadas de vendas de ingresso (com cache de 5 minutos)"""
    cache_key = "vendas_stats"

    # Tenta buscar do cache
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')

        sql = f"""
        SELECT
            COUNT(*) as total_transactions,
            SUM(CAST(quantidade AS FLOAT64)) as total_tickets,
            SUM(CAST(valor_liquido AS FLOAT64)) as total_revenue,
            SUM(CAST(valor_bruto AS FLOAT64)) as total_gross,
            SUM(CAST(valor_desconto AS FLOAT64)) as total_discounts,
            AVG(CAST(valor_liquido AS FLOAT64) / NULLIF(CAST(quantidade AS FLOAT64), 0)) as avg_ticket_price,
            COUNT(DISTINCT evento) as unique_events,
            COUNT(DISTINCT ticketeira) as unique_ticketeiras
        FROM `{table_ref}`
        WHERE quantidade > 0
        """

        result_list = bq_client.query(sql, cache_key='vendas_stats_query')

        if not result_list:
            return {
                "total_transactions": 0,
                "total_tickets": 0,
                "total_revenue": 0,
                "total_gross": 0,
                "total_discounts": 0,
                "avg_ticket_price": 0,
                "unique_events": 0,
                "unique_ticketeiras": 0
            }

        result = result_list[0]
        cache.set(cache_key, result, ttl_minutes=10)
        return result
    except Exception as e:
        logger.error(f"[Vendas Stats] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-event", response_model=List[Dict[str, Any]])
async def get_vendas_by_event():
    """Retorna vendas agrupadas por evento"""
    cache_key = "vendas_by_event"

    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')

        sql = f"""
        SELECT
            evento as nome_evento,
            MAX(data_evento) as data_evento,
            MAX(cidade) as cidade_evento,
            MAX(estado) as uf_evento,
            SUM(CAST(quantidade AS FLOAT64)) as total_quantity,
            SUM(CAST(valor_liquido AS FLOAT64)) as total_revenue,
            COUNT(*) as transaction_count
        FROM `{table_ref}`
        WHERE evento IS NOT NULL
        GROUP BY evento
        ORDER BY total_revenue DESC
        """

        result = bq_client.query(sql, cache_key='vendas_by_event_query')
        cache.set(cache_key, result, ttl_minutes=10)
        return result
    except Exception as e:
        logger.error(f"[Vendas By Event] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-channel", response_model=List[Dict[str, Any]])
async def get_vendas_by_channel():
    """Retorna vendas agrupadas por canal (ticketeira)"""
    cache_key = "vendas_by_channel"

    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')

        sql = f"""
        SELECT
            ticketeira as canal,
            SUM(CAST(quantidade AS FLOAT64)) as total_quantity,
            SUM(CAST(valor_liquido AS FLOAT64)) as total_revenue,
            COUNT(*) as transaction_count,
            COUNT(DISTINCT evento) as unique_events
        FROM `{table_ref}`
        WHERE ticketeira IS NOT NULL
        GROUP BY ticketeira
        ORDER BY total_revenue DESC
        """

        result = bq_client.query(sql, cache_key='vendas_by_channel_query')
        cache.set(cache_key, result, ttl_minutes=10)
        return result
    except Exception as e:
        logger.error(f"[Vendas By Channel] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-type", response_model=List[Dict[str, Any]])
async def get_vendas_by_type():
    """Retorna vendas agrupadas por tipo de ingresso"""
    cache_key = "vendas_by_type"

    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')

        sql = f"""
        SELECT
            tipo as tipo_ingresso,
            SUM(CAST(quantidade AS FLOAT64)) as total_quantity,
            SUM(CAST(valor_liquido AS FLOAT64)) as total_revenue,
            COUNT(*) as transaction_count,
            AVG(CAST(valor_liquido AS FLOAT64) / NULLIF(CAST(quantidade AS FLOAT64), 0)) as avg_price
        FROM `{table_ref}`
        WHERE tipo IS NOT NULL
        GROUP BY tipo
        ORDER BY total_revenue DESC
        """

        result = bq_client.query(sql, cache_key='vendas_by_type_query')
        cache.set(cache_key, result, ttl_minutes=10)
        return result
    except Exception as e:
        logger.error(f"[Vendas By Type] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

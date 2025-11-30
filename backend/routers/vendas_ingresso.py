from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from database import execute_query
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
async def get_vendas_ingresso(limit: int = 1000000, offset: int = 0):
    """Retorna dados de vendas de ingresso (padrão: 1.000.000 registros mais recentes)"""
    cache_key = f"vendas_data_{limit}_{offset}"

    # Tenta buscar do cache
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        logger.info(f"[Vendas Ingresso] Retornando {len(cached_data)} registros do cache")
        return cached_data

    try:
        query = f"""
            SELECT * FROM vendas_ingresso
            ORDER BY data_venda DESC
            LIMIT {limit} OFFSET {offset}
        """
        logger.debug(f"[Vendas] Executando query: {query[:100]}...")
        data = execute_query(query)

        logger.info(f"[Vendas] Raw data from DB - Type: {type(data)}, Content: {data if not data else f'{len(data)} rows'}")

        if not data:
            logger.warning("[Vendas] ⚠️  Nenhum dado retornado do banco!")
            return []

        normalized = _normalize_rows(data)
        logger.info(f"[Vendas] Normalizados {len(normalized)} registros (originais: {len(data)})")

        # Armazena no cache por 5 minutos
        cache.set(cache_key, normalized, ttl_minutes=5)

        logger.info(f"[Vendas] ✅ Retornou {len(normalized)} registros com sucesso")
        return normalized
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
        query = """
            SELECT
                COUNT(*) as total_transactions,
                SUM(quantidade) as total_tickets,
                SUM(CAST(valor_liquido AS NUMERIC)) as total_revenue,
                AVG(CAST(valor_liquido AS NUMERIC)) as avg_ticket_price,
                SUM(CAST(valor_bruto AS NUMERIC)) as total_gross,
                SUM(CAST(COALESCE(valor_desconto, 0) AS NUMERIC)) as total_discount
            FROM vendas_ingresso
        """
        stats = execute_query(query)
        result = stats[0] if stats else {}

        if isinstance(result, Mapping):
            result = {k: _normalize_value(v) for k, v in result.items()}

        # Armazena no cache por 5 minutos
        cache.set(cache_key, result, ttl_minutes=5)

        return result
    except Exception as e:
        logger.error(f"[Vendas Stats] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-event", response_model=List[Dict[str, Any]])
async def get_vendas_by_event():
    """Retorna vendas agrupadas por evento"""
    try:
        query = """
            SELECT
                evento as nome_evento,
                data_evento,
                cidade_evento,
                uf_evento,
                SUM(quantidade) as total_quantity,
                SUM(CAST(valor_liquido AS NUMERIC)) as total_revenue,
                COUNT(*) as transaction_count
            FROM vendas_ingresso
            WHERE evento IS NOT NULL
            GROUP BY evento, data_evento, cidade_evento, uf_evento
            ORDER BY total_revenue DESC
        """
        data = execute_query(query)
        return data
    except Exception as e:
        logger.error(f"[Vendas By Event] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-channel", response_model=List[Dict[str, Any]])
async def get_vendas_by_channel():
    """Retorna vendas agrupadas por canal (ticketeira)"""
    try:
        query = """
            SELECT
                ticketeira as canal,
                SUM(quantidade) as total_quantity,
                SUM(CAST(valor_liquido AS NUMERIC)) as total_revenue,
                COUNT(*) as transaction_count,
                COUNT(DISTINCT evento) as unique_events
            FROM vendas_ingresso
            WHERE ticketeira IS NOT NULL
            GROUP BY ticketeira
            ORDER BY total_revenue DESC
        """
        data = execute_query(query)
        return data
    except Exception as e:
        logger.error(f"[Vendas By Channel] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-type", response_model=List[Dict[str, Any]])
async def get_vendas_by_type():
    """Retorna vendas agrupadas por tipo de ingresso"""
    try:
        query = """
            SELECT
                tipo as tipo_ingresso,
                SUM(quantidade) as total_quantity,
                SUM(CAST(valor_liquido AS NUMERIC)) as total_revenue,
                COUNT(*) as transaction_count,
                AVG(CAST(valor_liquido AS NUMERIC)) as avg_price
            FROM vendas_ingresso
            WHERE tipo IS NOT NULL
            GROUP BY tipo
            ORDER BY total_revenue DESC
        """
        data = execute_query(query)
        return data
    except Exception as e:
        logger.error(f"[Vendas By Type] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

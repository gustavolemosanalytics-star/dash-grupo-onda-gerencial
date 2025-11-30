from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from csv_loader import csv_loader
from cache import cache
import logging
from decimal import Decimal
from datetime import datetime, date, time
import uuid
from collections.abc import Mapping, Sequence

router = APIRouter(prefix="/vendas-ingresso", tags=["Vendas de Ingresso"])
logger = logging.getLogger(__name__)

CSV_FILENAME = "vendas_ingresso_rows.csv"


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
async def get_vendas_ingresso(limit: int = 1000000, offset: int = 0):
    """Retorna dados de vendas de ingresso do CSV"""
    cache_key = f"vendas_data_{limit}_{offset}"

    # Tenta buscar do cache
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        logger.info(f"[Vendas Ingresso] Retornando {len(cached_data)} registros do cache")
        return cached_data

    try:
        # Carrega dados do CSV
        data = csv_loader.load_csv(CSV_FILENAME)

        if not data:
            logger.warning("[Vendas] ⚠️  Nenhum dado retornado do CSV!")
            return []

        # Aplica limite e offset
        paginated_data = data[offset:offset + limit]

        normalized = _normalize_rows(paginated_data)
        logger.info(f"[Vendas] Normalizados {len(normalized)} registros (originais: {len(paginated_data)})")

        # Armazena no cache por 5 minutos
        cache.set(cache_key, normalized, ttl_minutes=5)

        logger.info(f"[Vendas] ✅ Retornou {len(normalized)} registros com sucesso")
        return normalized
    except Exception as e:
        logger.error(f"[Vendas] ❌ Erro ao buscar dados: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=Dict[str, Any]])
async def get_vendas_stats():
    """Retorna estatísticas agregadas de vendas de ingresso (com cache de 5 minutos)"""
    cache_key = "vendas_stats"

    # Tenta buscar do cache
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    try:
        data = csv_loader.load_csv(CSV_FILENAME)

        if not data:
            return {}

        # Calcula estatísticas
        total_transactions = len(data)
        total_tickets = sum(row.get('quantidade', 0) or 0 for row in data)
        total_revenue = sum(float(row.get('valor_liquido', 0) or 0) for row in data)
        total_gross = sum(float(row.get('valor_bruto', 0) or 0) for row in data)
        total_discount = sum(float(row.get('valor_desconto', 0) or 0) for row in data)
        avg_ticket_price = total_revenue / total_transactions if total_transactions > 0 else 0

        result = {
            'total_transactions': total_transactions,
            'total_tickets': total_tickets,
            'total_revenue': total_revenue,
            'avg_ticket_price': avg_ticket_price,
            'total_gross': total_gross,
            'total_discount': total_discount
        }

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
        data = csv_loader.load_csv(CSV_FILENAME)

        if not data:
            return []

        # Agrupa por evento
        events = {}
        for row in data:
            evento = row.get('evento')
            if not evento:
                continue

            if evento not in events:
                events[evento] = {
                    'nome_evento': evento,
                    'data_evento': row.get('data_evento'),
                    'cidade_evento': row.get('cidade_evento'),
                    'uf_evento': row.get('uf_evento'),
                    'total_quantity': 0,
                    'total_revenue': 0,
                    'transaction_count': 0
                }

            events[evento]['total_quantity'] += row.get('quantidade', 0) or 0
            events[evento]['total_revenue'] += float(row.get('valor_liquido', 0) or 0)
            events[evento]['transaction_count'] += 1

        # Ordena por receita
        result = sorted(events.values(), key=lambda x: x['total_revenue'], reverse=True)
        return result
    except Exception as e:
        logger.error(f"[Vendas By Event] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-channel", response_model=List[Dict[str, Any]])
async def get_vendas_by_channel():
    """Retorna vendas agrupadas por canal (ticketeira)"""
    try:
        data = csv_loader.load_csv(CSV_FILENAME)

        if not data:
            return []

        # Agrupa por ticketeira
        channels = {}
        for row in data:
            ticketeira = row.get('ticketeira')
            if not ticketeira:
                continue

            if ticketeira not in channels:
                channels[ticketeira] = {
                    'canal': ticketeira,
                    'total_quantity': 0,
                    'total_revenue': 0,
                    'transaction_count': 0,
                    'unique_events': set()
                }

            channels[ticketeira]['total_quantity'] += row.get('quantidade', 0) or 0
            channels[ticketeira]['total_revenue'] += float(row.get('valor_liquido', 0) or 0)
            channels[ticketeira]['transaction_count'] += 1
            if row.get('evento'):
                channels[ticketeira]['unique_events'].add(row.get('evento'))

        # Converte sets para contagens
        for channel in channels.values():
            channel['unique_events'] = len(channel['unique_events'])

        # Ordena por receita
        result = sorted(channels.values(), key=lambda x: x['total_revenue'], reverse=True)
        return result
    except Exception as e:
        logger.error(f"[Vendas By Channel] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-type", response_model=List[Dict[str, Any]])
async def get_vendas_by_type():
    """Retorna vendas agrupadas por tipo de ingresso"""
    try:
        data = csv_loader.load_csv(CSV_FILENAME)

        if not data:
            return []

        # Agrupa por tipo
        types = {}
        for row in data:
            tipo = row.get('tipo')
            if not tipo:
                continue

            if tipo not in types:
                types[tipo] = {
                    'tipo_ingresso': tipo,
                    'total_quantity': 0,
                    'total_revenue': 0,
                    'transaction_count': 0,
                    'prices': []
                }

            valor_liquido = float(row.get('valor_liquido', 0) or 0)
            types[tipo]['total_quantity'] += row.get('quantidade', 0) or 0
            types[tipo]['total_revenue'] += valor_liquido
            types[tipo]['transaction_count'] += 1
            types[tipo]['prices'].append(valor_liquido)

        # Calcula média de preço
        for type_data in types.values():
            prices = type_data.pop('prices')
            type_data['avg_price'] = sum(prices) / len(prices) if prices else 0

        # Ordena por receita
        result = sorted(types.values(), key=lambda x: x['total_revenue'], reverse=True)
        return result
    except Exception as e:
        logger.error(f"[Vendas By Type] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from csv_loader import csv_loader
from cache import cache
import logging
from decimal import Decimal
from datetime import datetime, date, time
import uuid
from collections.abc import Mapping, Sequence

router = APIRouter(prefix="/bar", tags=["Bar"])
logger = logging.getLogger(__name__)

CSV_FILENAME = "bar_zig_rows.csv"


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
                    # fallback: armazenar representação
                    normalized.append({"_raw": str(row)})
                    continue

        d = {}
        for k, v in items:
            d[k] = _normalize_value(v)
        normalized.append(d)
    return normalized


@router.get("/", response_model=List[Dict[str, Any]])
async def get_bar_data(limit: int = 500000, offset: int = 0):
    """Retorna dados da tabela bar_zig do CSV (padrão: 500.000 registros)"""
    cache_key = f"bar_data_{limit}_{offset}"

    # Tenta buscar do cache
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        logger.info(f"[Bar] Retornando {len(cached_data)} registros do cache")
        return cached_data

    try:
        logger.info(f"[Bar] Carregando dados do CSV: {CSV_FILENAME}")
        data = csv_loader.load_csv(CSV_FILENAME)

        if not data:
            logger.warning(f"[Bar] ⚠️  Nenhum dado encontrado em {CSV_FILENAME}")
            return []

        # Aplicar limite e offset
        sliced_data = data[offset:offset + limit]

        normalized = _normalize_rows(sliced_data)
        logger.info(f"[Bar] ✅ Retornou {len(normalized)} registros (offset: {offset}, limit: {limit})")

        # Armazena no cache por 5 minutos
        cache.set(cache_key, normalized, ttl_minutes=5)

        return normalized
    except Exception as e:
        logger.error(f"[Bar] ❌ Erro ao buscar dados: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=Dict[str, Any])
async def get_bar_stats():
    """Retorna estatísticas agregadas do bar (com cache de 5 minutos)"""
    cache_key = "bar_stats"

    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    try:
        data = csv_loader.load_csv(CSV_FILENAME)

        if not data:
            return {
                "total_transactions": 0,
                "total_revenue": 0,
                "unique_products": 0,
                "unique_events": 0
            }

        total_transactions = len(data)
        total_revenue = sum(
            ((row.get('unitValue') or 0) * (row.get('count') or 1) - (row.get('discountValue') or 0))
            for row in data
        )
        unique_products = len(set(row.get('productName') for row in data if row.get('productName')))
        unique_events = len(set(row.get('eventName') for row in data if row.get('eventName')))

        result = {
            "total_transactions": total_transactions,
            "total_revenue": total_revenue,
            "unique_products": unique_products,
            "unique_events": unique_events
        }

        cache.set(cache_key, result, ttl_minutes=5)
        return result
    except Exception as e:
        logger.error(f"[Bar Stats] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-product", response_model=List[Dict[str, Any]])
async def get_bar_by_product():
    """Retorna vendas agrupadas por produto"""
    try:
        data = csv_loader.load_csv(CSV_FILENAME)

        if not data:
            return []

        # Agrupar por produto
        product_sales = {}
        for row in data:
            product = row.get('productName')
            category = row.get('productCategory')

            if not product:
                continue

            if product not in product_sales:
                product_sales[product] = {
                    'product': product,
                    'category': category,
                    'total_quantity': 0,
                    'total_revenue': 0,
                    'transaction_count': 0
                }

            unit_value = row.get('unitValue') or 0
            count = row.get('count') or 1
            discount = row.get('discountValue') or 0
            revenue = unit_value * count - discount

            product_sales[product]['total_quantity'] += count
            product_sales[product]['total_revenue'] += revenue
            product_sales[product]['transaction_count'] += 1

        result = sorted(product_sales.values(), key=lambda x: x['total_revenue'], reverse=True)
        return result
    except Exception as e:
        logger.error(f"[Bar By Product] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-event", response_model=List[Dict[str, Any]])
async def get_bar_by_event():
    """Retorna vendas agrupadas por evento"""
    try:
        data = csv_loader.load_csv(CSV_FILENAME)

        if not data:
            return []

        event_sales = {}
        for row in data:
            event = row.get('eventName')
            event_date = row.get('eventDate')

            if not event:
                continue

            key = (event, event_date)
            if key not in event_sales:
                event_sales[key] = {
                    'event': event,
                    'event_date': event_date,
                    'total_quantity': 0,
                    'total_revenue': 0,
                    'transaction_count': 0
                }

            unit_value = row.get('unitValue') or 0
            count = row.get('count') or 1
            discount = row.get('discountValue') or 0
            revenue = unit_value * count - discount

            event_sales[key]['total_quantity'] += count
            event_sales[key]['total_revenue'] += revenue
            event_sales[key]['transaction_count'] += 1

        result = sorted(event_sales.values(), key=lambda x: x['total_revenue'], reverse=True)
        return result
    except Exception as e:
        logger.error(f"[Bar By Event] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-category", response_model=List[Dict[str, Any]])
async def get_bar_by_category():
    """Retorna vendas agrupadas por categoria"""
    try:
        data = csv_loader.load_csv(CSV_FILENAME)

        if not data:
            return []

        category_sales = {}
        for row in data:
            category = row.get('productCategory') or 'Sem categoria'

            if category not in category_sales:
                category_sales[category] = {
                    'category': category,
                    'total_quantity': 0,
                    'total_revenue': 0,
                    'transaction_count': 0,
                    'unique_products': set()
                }

            unit_value = row.get('unitValue') or 0
            count = row.get('count') or 1
            discount = row.get('discountValue') or 0
            revenue = unit_value * count - discount

            category_sales[category]['total_quantity'] += count
            category_sales[category]['total_revenue'] += revenue
            category_sales[category]['transaction_count'] += 1

            product = row.get('productName')
            if product:
                category_sales[category]['unique_products'].add(product)

        # Converter sets para counts
        for cat in category_sales.values():
            cat['unique_products'] = len(cat['unique_products'])

        result = sorted(category_sales.values(), key=lambda x: x['total_revenue'], reverse=True)
        return result
    except Exception as e:
        logger.error(f"[Bar By Category] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reload")
async def reload_csv():
    """Força recarga do arquivo CSV (útil após atualização semanal)"""
    try:
        logger.info("[Bar] 🔄 Recarregando CSV...")
        csv_loader.reload(CSV_FILENAME)
        cache.clear()  # Limpa cache antigo
        logger.info("[Bar] ✅ CSV recarregado e cache limpo")
        return {"status": "reloaded", "filename": CSV_FILENAME}
    except Exception as e:
        logger.error(f"[Bar] ❌ Erro ao recarregar CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache-info")
async def get_cache_info():
    """Retorna informações de cache"""
    return csv_loader.get_cache_info(CSV_FILENAME)

"""
Endpoints agregados para Bar - consulta BigQuery
Retorna apenas dados sumarizados necessários para o dashboard
OTIMIZADO: Usa agregação SQL no BigQuery em vez de carregar tudo na memória
"""
from fastapi import APIRouter, HTTPException, Query
import logging
from typing import List, Dict, Any, Optional
from cache import cache
from bigquery_client import bq_client

router = APIRouter(prefix="/bar-aggregated", tags=["Bar Aggregated"])
logger = logging.getLogger(__name__)


def build_where_clause(evento_tipo: Optional[str] = None, event_name: Optional[str] = None,
                       event_date: Optional[str] = None) -> str:
    """Constrói cláusula WHERE baseada nos filtros"""
    conditions = ["isRefunded = FALSE"]  # Sempre filtrar refunded

    if evento_tipo:
        conditions.append(f"_evento_tipo = '{evento_tipo}'")
    if event_name:
        conditions.append(f"eventName = '{event_name}'")
    if event_date:
        conditions.append(f"FORMAT_DATE('%Y-%m-%d', eventDate) = '{event_date}'")

    return " AND ".join(conditions)


@router.get("/metrics")
async def get_metrics(
    evento_tipo: Optional[str] = Query(None),
    event_name: Optional[str] = Query(None),
    event_date: Optional[str] = Query(None)
):
    """Retorna métricas principais do bar com filtros opcionais"""
    try:
        table_ref = bq_client._get_table_ref('bar_zig')
        where_clause = build_where_clause(evento_tipo, event_name, event_date)

        cache_key = f"bar_metrics_{hash(where_clause)}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Valores já estão em centavos no BigQuery, precisamos dividir por 100
        sql = f"""
        SELECT
            COUNT(*) as total_transactions,
            SUM((unitValue * count - IFNULL(discountValue, 0)) / 100) as total_revenue,
            SUM(count) as total_products_sold
        FROM `{table_ref}`
        WHERE {where_clause}
        """

        result = bq_client.query(sql)
        if not result:
            return {
                "total_transactions": 0,
                "total_revenue": 0,
                "total_products_sold": 0,
                "avg_ticket": 0
            }

        row = result[0]
        total_transactions = int(row.get('total_transactions', 0) or 0)
        total_revenue = float(row.get('total_revenue', 0) or 0)
        total_products_sold = int(row.get('total_products_sold', 0) or 0)
        avg_ticket = total_revenue / total_transactions if total_transactions > 0 else 0

        response = {
            "total_transactions": total_transactions,
            "total_revenue": total_revenue,
            "total_products_sold": total_products_sold,
            "avg_ticket": avg_ticket
        }

        cache.set(cache_key, response, ttl_minutes=15)
        return response

    except Exception as e:
        logger.error(f"[Bar Metrics] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sales-by-date")
async def get_sales_by_date(
    evento_tipo: Optional[str] = Query(None),
    event_name: Optional[str] = Query(None),
    event_date: Optional[str] = Query(None)
):
    """Retorna vendas agregadas por data com filtros opcionais"""
    try:
        table_ref = bq_client._get_table_ref('bar_zig')
        where_clause = build_where_clause(evento_tipo, event_name, event_date)

        sql = f"""
        SELECT
            FORMAT_DATE('%Y-%m-%d', transactionDate) as date,
            SUM((unitValue * count - IFNULL(discountValue, 0)) / 100) as revenue,
            SUM(count) as count
        FROM `{table_ref}`
        WHERE {where_clause}
        GROUP BY date
        ORDER BY date
        """

        return bq_client.query(sql)

    except Exception as e:
        logger.error(f"[Bar Sales By Date] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-products")
async def get_top_products(
    limit: int = 5,
    evento_tipo: Optional[str] = Query(None),
    event_name: Optional[str] = Query(None),
    event_date: Optional[str] = Query(None)
):
    """Retorna top produtos por faturamento com filtros opcionais"""
    try:
        table_ref = bq_client._get_table_ref('bar_zig')
        where_clause = build_where_clause(evento_tipo, event_name, event_date)

        sql = f"""
        SELECT
            productName as name,
            SUM((unitValue * count - IFNULL(discountValue, 0)) / 100) as revenue,
            SUM(count) as quantity
        FROM `{table_ref}`
        WHERE {where_clause}
        GROUP BY productName
        ORDER BY revenue DESC
        LIMIT {limit}
        """

        return bq_client.query(sql)

    except Exception as e:
        logger.error(f"[Bar Top Products] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-category")
async def get_by_category(
    evento_tipo: Optional[str] = Query(None),
    event_name: Optional[str] = Query(None),
    event_date: Optional[str] = Query(None)
):
    """Retorna vendas por categoria com filtros opcionais"""
    try:
        table_ref = bq_client._get_table_ref('bar_zig')
        where_clause = build_where_clause(evento_tipo, event_name, event_date)

        sql = f"""
        SELECT
            IFNULL(productCategory, 'Sem categoria') as name,
            SUM((unitValue * count - IFNULL(discountValue, 0)) / 100) as revenue
        FROM `{table_ref}`
        WHERE {where_clause}
        GROUP BY productCategory
        ORDER BY revenue DESC
        """

        return bq_client.query(sql)

    except Exception as e:
        logger.error(f"[Bar By Category] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent-transactions")
async def get_recent_transactions(
    limit: int = 20,
    evento_tipo: Optional[str] = Query(None),
    event_name: Optional[str] = Query(None),
    event_date: Optional[str] = Query(None)
):
    """Retorna transações mais recentes com filtros opcionais"""
    try:
        table_ref = bq_client._get_table_ref('bar_zig')
        where_clause = build_where_clause(evento_tipo, event_name, event_date)

        sql = f"""
        SELECT
            transactionId as id,
            FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S', transactionDate) as transactionDate,
            productName,
            productCategory,
            eventName,
            count,
            unitValue / 100 as unitValue,
            IFNULL(discountValue, 0) / 100 as discountValue,
            ((unitValue * count - IFNULL(discountValue, 0)) / 100) as total
        FROM `{table_ref}`
        WHERE {where_clause}
        ORDER BY transactionDate DESC
        LIMIT {limit}
        """

        return bq_client.query(sql)

    except Exception as e:
        logger.error(f"[Bar Recent] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filters")
async def get_filters(
    evento_tipo: Optional[str] = Query(None),
    event_name: Optional[str] = Query(None),
    event_date: Optional[str] = Query(None)
):
    """Retorna opções de filtros disponíveis (filtros dinâmicos baseados em outros filtros ativos)"""
    try:
        table_ref = bq_client._get_table_ref('bar_zig')
        where_clause = build_where_clause(evento_tipo, event_name, event_date)

        cache_key = f"bar_filters_{hash(where_clause)}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Executar queries separadas para cada filtro (ARRAY_AGG não funciona bem com o client)
        response = {
            "tipos": [],
            "events": [],
            "event_dates": []
        }

        # Tipos de Evento
        sql_tipos = f"""
        SELECT DISTINCT _evento_tipo
        FROM `{table_ref}`
        WHERE _evento_tipo IS NOT NULL AND {where_clause}
        ORDER BY _evento_tipo
        LIMIT 1000
        """
        tipos_result = bq_client.query(sql_tipos)
        response["tipos"] = [row['_evento_tipo'] for row in tipos_result if row.get('_evento_tipo')]

        # Event Names
        sql_events = f"""
        SELECT DISTINCT eventName
        FROM `{table_ref}`
        WHERE eventName IS NOT NULL AND {where_clause}
        ORDER BY eventName
        LIMIT 1000
        """
        events_result = bq_client.query(sql_events)
        response["events"] = [row['eventName'] for row in events_result if row.get('eventName')]

        # Event Dates - retorna direto o valor da coluna
        sql_dates = f"""
        SELECT DISTINCT FORMAT_DATE('%Y-%m-%d', DATE(eventDate)) as data_formatada
        FROM `{table_ref}`
        WHERE eventDate IS NOT NULL AND {where_clause}
        ORDER BY data_formatada DESC
        LIMIT 1000
        """
        dates_result = bq_client.query(sql_dates)
        response["event_dates"] = [row['data_formatada'] for row in dates_result if row.get('data_formatada') and row['data_formatada'].strip()]

        cache.set(cache_key, response, ttl_minutes=15)
        return response

    except Exception as e:
        logger.error(f"[Bar Filters] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming-events")
async def get_upcoming_events():
    """Retorna eventos futuros com contagem de dias restantes"""
    try:
        table_ref = bq_client._get_table_ref('bar_zig')

        cache_key = "bar_upcoming_events"
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Query para buscar eventos futuros únicos
        sql = f"""
        SELECT DISTINCT
            eventName,
            FORMAT_DATE('%Y-%m-%d', eventDate) as event_date,
            eventDate as event_date_raw
        FROM `{table_ref}`
        WHERE eventDate >= CURRENT_DATE()
          AND isRefunded = FALSE
          AND eventName IS NOT NULL
        ORDER BY event_date_raw ASC
        LIMIT 20
        """

        result = bq_client.query(sql)

        events = []
        for row in result:
            event_name = row.get('eventName')
            event_date = row.get('event_date')
            if event_name and event_date:
                events.append({
                    "event_name": event_name,
                    "event_date": event_date
                })

        # Remover duplicatas (mesmo evento na mesma data)
        seen = set()
        unique_events = []
        for event in events:
            key = f"{event['event_name']}_{event['event_date']}"
            if key not in seen:
                seen.add(key)
                unique_events.append(event)

        cache.set(cache_key, unique_events, ttl_minutes=30)
        return unique_events

    except Exception as e:
        logger.error(f"[Bar Upcoming Events] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

        sql = f"""
        SELECT
            ARRAY_AGG(DISTINCT _evento_tipo IGNORE NULLS ORDER BY _evento_tipo) as tipos,
            ARRAY_AGG(DISTINCT eventName IGNORE NULLS ORDER BY eventName) as events,
            ARRAY_AGG(DISTINCT FORMAT_DATE('%d/%m/%Y', eventDate) IGNORE NULLS ORDER BY eventDate DESC) as event_dates
        FROM `{table_ref}`
        WHERE {where_clause}
        """

        result = bq_client.query(sql)
        if not result:
            response = {
                "tipos": [],
                "events": [],
                "event_dates": []
            }
        else:
            row = result[0]
            response = {
                "tipos": row.get('tipos', []) or [],
                "events": row.get('events', []) or [],
                "event_dates": row.get('event_dates', []) or []
            }

        cache.set(cache_key, response, ttl_minutes=15)
        return response

    except Exception as e:
        logger.error(f"[Bar Filters] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

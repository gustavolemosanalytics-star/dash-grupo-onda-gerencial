"""
Dashboard endpoint - combina dados de todas as tabelas do BigQuery
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from bigquery_client import bq_client
from cache import cache
import logging

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=Dict[str, Any])
async def get_dashboard():
    """Retorna dados agregados para o dashboard"""
    cache_key = "dashboard_data"

    # Tentar buscar do cache
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        logger.info("[Dashboard] Retornando dados do cache")
        return cached_data

    try:
        logger.info("[Dashboard] Carregando dados do BigQuery")

        # Bar Stats
        bar_table_ref = bq_client._get_table_ref('bar_zig')
        bar_stats_sql = f"""
        SELECT
            COUNT(*) as total_transactions,
            SUM(unitValue * count - IFNULL(discountValue, 0)) as total_revenue,
            COUNT(DISTINCT productName) as unique_products,
            COUNT(DISTINCT eventName) as unique_events
        FROM `{bar_table_ref}`
        WHERE isRefunded = FALSE
        """
        bar_stats_result = bq_client.query(bar_stats_sql, cache_key='dashboard_bar_stats')
        bar_stats = bar_stats_result[0] if bar_stats_result else {
            "total_transactions": 0,
            "total_revenue": 0,
            "unique_products": 0,
            "unique_events": 0
        }

        # Vendas Stats (novo schema)
        vendas_table_ref = bq_client._get_table_ref('vendas_ingresso')
        vendas_stats_sql = f"""
        SELECT
            COUNT(*) as total_sales,
            SUM(CAST(quantidade AS FLOAT64)) as total_tickets,
            SUM(CAST(valor_bruto AS FLOAT64)) as total_gross,
            SUM(CAST(valor_liquido AS FLOAT64)) as total_net,
            COUNT(DISTINCT evento) as unique_events,
            COUNT(DISTINCT ticketeira) as unique_ticketeiras
        FROM `{vendas_table_ref}`
        """
        vendas_stats_result = bq_client.query(vendas_stats_sql, cache_key='dashboard_vendas_stats')
        vendas_stats = vendas_stats_result[0] if vendas_stats_result else {
            "total_sales": 0,
            "total_tickets": 0,
            "total_gross": 0,
            "total_net": 0,
            "unique_events": 0,
            "unique_ticketeiras": 0
        }

        # Planejamento Stats (novo schema)
        planejamento_table_ref = bq_client._get_table_ref('planejamento')
        planejamento_stats_sql = f"""
        SELECT
            COUNT(*) as total_eventos,
            SUM(CAST(publico_estimado AS INT64)) as publico_total_estimado,
            SUM(CAST(ingressos_emitidos AS INT64)) as ingressos_emitidos_total,
            SUM(CAST(ingressos_validados AS INT64)) as ingressos_validados_total,
            COUNT(DISTINCT cidade_do_evento) as total_cidades,
            COUNT(DISTINCT base) as total_bases
        FROM `{planejamento_table_ref}`
        WHERE publico_estimado IS NOT NULL AND publico_estimado != ''
        """
        planejamento_stats_result = bq_client.query(planejamento_stats_sql, cache_key='dashboard_planejamento_stats')
        planejamento_stats = planejamento_stats_result[0] if planejamento_stats_result else {
            "total_eventos": 0,
            "publico_total_estimado": 0,
            "ingressos_emitidos_total": 0,
            "ingressos_validados_total": 0,
            "total_cidades": 0,
            "total_bases": 0
        }

        dashboard_data = {
            "bar": bar_stats,
            "vendas": vendas_stats,
            "planejamento": planejamento_stats,
            "summary": {
                "total_revenue": (bar_stats.get("total_revenue", 0) or 0) + (vendas_stats.get("total_net", 0) or 0),
                "total_events": max(
                    bar_stats.get("unique_events", 0) or 0,
                    vendas_stats.get("unique_events", 0) or 0,
                    planejamento_stats.get("total_eventos", 0) or 0
                )
            }
        }

        # Cache por 10 minutos
        cache.set(cache_key, dashboard_data, ttl_minutes=10)

        logger.info("[Dashboard] ✅ Dados carregados com sucesso")
        return dashboard_data

    except Exception as e:
        logger.error(f"[Dashboard] ❌ Erro ao carregar dados: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

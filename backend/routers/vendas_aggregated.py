"""
Endpoints agregados para Vendas de Ingresso - consulta BigQuery
Retorna apenas dados sumarizados necessários para o dashboard
OTIMIZADO: Usa agregação SQL no BigQuery em vez de carregar tudo na memória
"""
from fastapi import APIRouter, HTTPException, Query
import logging
from typing import List, Dict, Any, Optional
from cache import cache
from bigquery_client import bq_client

router = APIRouter(prefix="/vendas-aggregated", tags=["Vendas Aggregated"])
logger = logging.getLogger(__name__)


def build_where_clause(cidade: Optional[str] = None, evento: Optional[str] = None,
                       base_responsavel: Optional[str] = None, ticketeira: Optional[str] = None,
                       data_evento: Optional[str] = None) -> str:
    """Constrói cláusula WHERE baseada nos filtros"""
    conditions = []

    if cidade:
        conditions.append(f"cidade_evento = '{cidade}'")
    if evento:
        conditions.append(f"evento = '{evento}'")
    if base_responsavel:
        conditions.append(f"base_responsavel = '{base_responsavel}'")
    if ticketeira:
        conditions.append(f"ticketeira = '{ticketeira}'")
    if data_evento:
        conditions.append(f"FORMAT_DATE('%Y-%m-%d', data_evento) = '{data_evento}'")

    return " AND " + " AND ".join(conditions) if conditions else ""


@router.get("/metrics")
async def get_metrics(
    cidade: Optional[str] = Query(None),
    evento: Optional[str] = Query(None),
    base_responsavel: Optional[str] = Query(None),
    ticketeira: Optional[str] = Query(None),
    data_evento: Optional[str] = Query(None)
):
    """Retorna métricas principais de vendas com filtros opcionais"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')
        where_clause = build_where_clause(cidade, evento, base_responsavel, ticketeira, data_evento)

        cache_key = f"vendas_metrics_{hash(where_clause)}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        sql = f"""
        SELECT
            COUNT(*) as total_vendas,
            SUM(CAST(quantidade AS FLOAT64)) as total_ingressos,
            SUM(CAST(valor_liquido AS FLOAT64)) as total_receita
        FROM `{table_ref}`
        WHERE 1=1 {where_clause}
        """

        result = bq_client.query(sql)
        if not result:
            return {
                "total_vendas": 0,
                "total_ingressos": 0,
                "total_receita": 0,
                "ticket_medio": 0
            }

        row = result[0]
        total_ingressos = int(row.get('total_ingressos', 0) or 0)
        total_receita = float(row.get('total_receita', 0) or 0)
        ticket_medio = total_receita / total_ingressos if total_ingressos > 0 else 0

        response = {
            "total_vendas": int(row.get('total_vendas', 0) or 0),
            "total_ingressos": total_ingressos,
            "total_receita": total_receita,
            "ticket_medio": ticket_medio
        }

        cache.set(cache_key, response, ttl_minutes=15)
        return response

    except Exception as e:
        logger.error(f"[Vendas Metrics] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-event")
async def get_by_event(
    limit: int = 10,
    cidade: Optional[str] = Query(None),
    evento: Optional[str] = Query(None),
    base_responsavel: Optional[str] = Query(None),
    ticketeira: Optional[str] = Query(None),
    data_evento: Optional[str] = Query(None)
):
    """Retorna vendas por evento (top N) com filtros opcionais"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')
        where_clause = build_where_clause(cidade, evento, base_responsavel, ticketeira, data_evento)

        sql = f"""
        SELECT
            evento as name,
            SUM(CAST(valor_liquido AS FLOAT64)) as Receita,
            SUM(CAST(quantidade AS FLOAT64)) as Ingressos
        FROM `{table_ref}`
        WHERE evento IS NOT NULL {where_clause}
        GROUP BY evento
        ORDER BY Receita DESC
        LIMIT {limit}
        """

        return bq_client.query(sql)

    except Exception as e:
        logger.error(f"[Vendas By Event] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-channel")
async def get_by_channel(
    cidade: Optional[str] = Query(None),
    evento: Optional[str] = Query(None),
    base_responsavel: Optional[str] = Query(None),
    ticketeira: Optional[str] = Query(None),
    data_evento: Optional[str] = Query(None)
):
    """Retorna vendas por canal (ticketeira) com filtros opcionais"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')
        where_clause = build_where_clause(cidade, evento, base_responsavel, ticketeira, data_evento)

        sql = f"""
        SELECT
            IFNULL(ticketeira, 'Não especificado') as label,
            SUM(CAST(valor_liquido AS FLOAT64)) as value,
            SUM(CAST(quantidade AS FLOAT64)) as quantity
        FROM `{table_ref}`
        WHERE 1=1 {where_clause}
        GROUP BY ticketeira
        ORDER BY value DESC
        """

        return bq_client.query(sql)

    except Exception as e:
        logger.error(f"[Vendas By Channel] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-type")
async def get_by_type(
    cidade: Optional[str] = Query(None),
    evento: Optional[str] = Query(None),
    base_responsavel: Optional[str] = Query(None),
    ticketeira: Optional[str] = Query(None),
    data_evento: Optional[str] = Query(None)
):
    """Retorna vendas por tipo de ingresso com filtros opcionais"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')
        where_clause = build_where_clause(cidade, evento, base_responsavel, ticketeira, data_evento)

        sql = f"""
        SELECT
            IFNULL(tipo, 'Não especificado') as name,
            SUM(CAST(valor_liquido AS FLOAT64)) as value
        FROM `{table_ref}`
        WHERE 1=1 {where_clause}
        GROUP BY tipo
        ORDER BY value DESC
        """

        return bq_client.query(sql)

    except Exception as e:
        logger.error(f"[Vendas By Type] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent-sales")
async def get_recent_sales(
    limit: int = 10,
    cidade: Optional[str] = Query(None),
    evento: Optional[str] = Query(None),
    base_responsavel: Optional[str] = Query(None),
    ticketeira: Optional[str] = Query(None),
    data_evento: Optional[str] = Query(None)
):
    """Retorna vendas mais recentes com filtros opcionais"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')
        where_clause = build_where_clause(cidade, evento, base_responsavel, ticketeira, data_evento)

        sql = f"""
        SELECT
            CAST(id AS STRING) as id,
            evento,
            tipo,
            ticketeira,
            CAST(quantidade AS INT64) as quantidade,
            CAST(valor_liquido AS FLOAT64) / CAST(quantidade AS FLOAT64) as valor_unitario,
            CAST(valor_liquido AS FLOAT64) as valor_liquido,
            status
        FROM `{table_ref}`
        WHERE data_venda IS NOT NULL {where_clause}
        ORDER BY data_venda DESC
        LIMIT {limit}
        """

        return bq_client.query(sql)

    except Exception as e:
        logger.error(f"[Vendas Recent] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filters")
async def get_filters(
    cidade: Optional[str] = Query(None),
    evento: Optional[str] = Query(None),
    base_responsavel: Optional[str] = Query(None),
    ticketeira: Optional[str] = Query(None),
    data_evento: Optional[str] = Query(None)
):
    """Retorna opções de filtros disponíveis (filtros dinâmicos baseados em outros filtros ativos)"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')
        where_clause = build_where_clause(cidade, evento, base_responsavel, ticketeira, data_evento)

        cache_key = f"vendas_filters_{hash(where_clause)}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Executar queries separadas para cada filtro (ARRAY_AGG não funciona bem com o client)
        response = {
            "cidades": [],
            "eventos": [],
            "bases": [],
            "ticketeiras": [],
            "datas_evento": []
        }

        # Cidades
        sql_cidades = f"""
        SELECT DISTINCT cidade_evento
        FROM `{table_ref}`
        WHERE cidade_evento IS NOT NULL {where_clause}
        ORDER BY cidade_evento
        LIMIT 1000
        """
        cidades_result = bq_client.query(sql_cidades)
        response["cidades"] = [row['cidade_evento'] for row in cidades_result if row.get('cidade_evento')]

        # Eventos
        sql_eventos = f"""
        SELECT DISTINCT evento
        FROM `{table_ref}`
        WHERE evento IS NOT NULL {where_clause}
        ORDER BY evento
        LIMIT 1000
        """
        eventos_result = bq_client.query(sql_eventos)
        response["eventos"] = [row['evento'] for row in eventos_result if row.get('evento')]

        # Bases
        sql_bases = f"""
        SELECT DISTINCT base_responsavel
        FROM `{table_ref}`
        WHERE base_responsavel IS NOT NULL {where_clause}
        ORDER BY base_responsavel
        LIMIT 1000
        """
        bases_result = bq_client.query(sql_bases)
        response["bases"] = [row['base_responsavel'] for row in bases_result if row.get('base_responsavel')]

        # Ticketeiras
        sql_ticketeiras = f"""
        SELECT DISTINCT ticketeira
        FROM `{table_ref}`
        WHERE ticketeira IS NOT NULL {where_clause}
        ORDER BY ticketeira
        LIMIT 1000
        """
        ticketeiras_result = bq_client.query(sql_ticketeiras)
        response["ticketeiras"] = [row['ticketeira'] for row in ticketeiras_result if row.get('ticketeira')]

        # Datas - retorna direto o valor da coluna
        sql_datas = f"""
        SELECT DISTINCT CAST(data_evento AS STRING) as data_formatada
        FROM `{table_ref}`
        WHERE data_evento IS NOT NULL {where_clause}
        ORDER BY data_formatada DESC
        LIMIT 1000
        """
        datas_result = bq_client.query(sql_datas)
        response["datas_evento"] = [row['data_formatada'] for row in datas_result if row.get('data_formatada') and row['data_formatada'].strip()]

        cache.set(cache_key, response, ttl_minutes=15)
        return response

    except Exception as e:
        logger.error(f"[Vendas Filters] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

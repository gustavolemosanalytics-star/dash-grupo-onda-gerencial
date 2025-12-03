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


def normalize_ticket_type(tipo: str) -> str:
    """
    Normaliza o tipo de ingresso para categorias padronizadas.
    Agrupa variações como FRONT, Front, front -> Front Stage
    """
    if not tipo:
        return "Outros"

    tipo_upper = tipo.upper()

    # Front Stage - variações de front
    if any(word in tipo_upper for word in ['FRONT', 'FRONTSTAGE', 'FRONT STAGE', 'FRONT-STAGE']):
        return "Front Stage"

    # Backstage
    if 'BACKSTAGE' in tipo_upper or 'BACK STAGE' in tipo_upper or 'BACK-STAGE' in tipo_upper:
        return "Backstage"

    # Open Bar - deve vir antes de Open para não capturar errado
    if 'OPEN BAR' in tipo_upper or 'OPENBAR' in tipo_upper:
        return "Open Bar"

    # Open (sem bar)
    if tipo_upper.startswith('OPEN') or ' OPEN' in tipo_upper or 'OPEN:' in tipo_upper:
        return "Open"

    # Arena
    if 'ARENA' in tipo_upper:
        return "Arena"

    # Premium / Pista Premium
    if 'PREMIUM' in tipo_upper:
        return "Premium"

    # Pista (sem premium)
    if 'PISTA' in tipo_upper:
        return "Pista"

    # Camarote
    if 'CAMAROTE' in tipo_upper:
        return "Camarote"

    # VIP
    if 'VIP' in tipo_upper:
        return "VIP"

    # Gramado
    if 'GRAMADO' in tipo_upper:
        return "Gramado"

    # Cortesia
    if 'CORTESIA' in tipo_upper or 'COURTESY' in tipo_upper:
        return "Cortesia"

    # Meia (genérico)
    if 'MEIA' in tipo_upper and not any(x in tipo_upper for x in ['FRONT', 'OPEN', 'ARENA', 'PREMIUM', 'PISTA', 'CAMAROTE', 'VIP', 'GRAMADO']):
        return "Meia Entrada"

    # Inteira (genérico)
    if 'INTEIRA' in tipo_upper and not any(x in tipo_upper for x in ['FRONT', 'OPEN', 'ARENA', 'PREMIUM', 'PISTA', 'CAMAROTE', 'VIP', 'GRAMADO']):
        return "Inteira"

    return "Outros"


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
    """Retorna vendas por tipo de ingresso com filtros opcionais (normalizado)"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')
        where_clause = build_where_clause(cidade, evento, base_responsavel, ticketeira, data_evento)

        # Buscar dados brutos agrupados por tipo original
        sql = f"""
        SELECT
            IFNULL(tipo, 'Não especificado') as tipo_original,
            SUM(CAST(valor_liquido AS FLOAT64)) as valor,
            SUM(CAST(quantidade AS INT64)) as quantidade
        FROM `{table_ref}`
        WHERE 1=1 {where_clause}
        GROUP BY tipo
        ORDER BY valor DESC
        """

        raw_data = bq_client.query(sql)

        # Normalizar e agregar por categoria
        normalized_data: Dict[str, Dict[str, float]] = {}
        for row in raw_data:
            tipo_original = row.get('tipo_original', 'Não especificado')
            categoria = normalize_ticket_type(tipo_original)
            valor = float(row.get('valor', 0) or 0)
            quantidade = int(row.get('quantidade', 0) or 0)

            if categoria not in normalized_data:
                normalized_data[categoria] = {'value': 0, 'quantidade': 0}

            normalized_data[categoria]['value'] += valor
            normalized_data[categoria]['quantidade'] += quantidade

        # Converter para lista ordenada por valor
        result = [
            {'name': categoria, 'value': data['value'], 'quantidade': data['quantidade']}
            for categoria, data in normalized_data.items()
        ]
        result.sort(key=lambda x: x['value'], reverse=True)

        return result

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


@router.get("/by-city")
async def get_by_city(
    cidade: Optional[str] = Query(None),
    evento: Optional[str] = Query(None),
    base_responsavel: Optional[str] = Query(None),
    ticketeira: Optional[str] = Query(None),
    data_evento: Optional[str] = Query(None)
):
    """Retorna receita agrupada por cidade do evento"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')
        where_clause = build_where_clause(cidade, evento, base_responsavel, ticketeira, data_evento)

        sql = f"""
        SELECT
            IFNULL(cidade_evento, 'Não especificada') as cidade,
            SUM(CAST(valor_liquido AS FLOAT64)) as receita,
            SUM(CAST(quantidade AS INT64)) as ingressos
        FROM `{table_ref}`
        WHERE 1=1 {where_clause}
        GROUP BY cidade_evento
        ORDER BY receita DESC
        LIMIT 15
        """

        return bq_client.query(sql)

    except Exception as e:
        logger.error(f"[Vendas By City] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-uf")
async def get_by_uf(
    cidade: Optional[str] = Query(None),
    evento: Optional[str] = Query(None),
    base_responsavel: Optional[str] = Query(None),
    ticketeira: Optional[str] = Query(None),
    data_evento: Optional[str] = Query(None)
):
    """Retorna receita agrupada por UF do evento"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')
        where_clause = build_where_clause(cidade, evento, base_responsavel, ticketeira, data_evento)

        sql = f"""
        SELECT
            IFNULL(uf_evento, 'N/A') as uf,
            SUM(CAST(valor_liquido AS FLOAT64)) as receita,
            SUM(CAST(quantidade AS INT64)) as ingressos
        FROM `{table_ref}`
        WHERE 1=1 {where_clause}
        GROUP BY uf_evento
        ORDER BY receita DESC
        """

        return bq_client.query(sql)

    except Exception as e:
        logger.error(f"[Vendas By UF] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming-events")
async def get_upcoming_events():
    """Retorna eventos futuros com métricas de vendas"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')

        cache_key = "vendas_upcoming_events"
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Query para buscar eventos futuros com métricas agregadas
        sql = f"""
        SELECT
            evento,
            cidade_evento,
            FORMAT_DATE('%Y-%m-%d', data_evento) as data_evento_fmt,
            data_evento,
            COUNT(*) as total_vendas,
            SUM(quantidade) as total_ingressos,
            SUM(valor_liquido) as faturamento_total,
            SUM(CASE WHEN valor_liquido > 0 THEN valor_liquido ELSE 0 END) as receita_liquida,
            COUNT(DISTINCT ticketeira) as qtd_ticketeiras
        FROM `{table_ref}`
        WHERE data_evento >= CURRENT_DATE()
          AND evento IS NOT NULL
        GROUP BY evento, cidade_evento, data_evento
        ORDER BY data_evento ASC
        LIMIT 50
        """

        result = bq_client.query(sql)

        events = []
        for row in result:
            evento = row.get('evento')
            if not evento:
                continue

            events.append({
                "evento": evento,
                "cidade": row.get('cidade_evento') or '',
                "data_evento": row.get('data_evento_fmt'),
                "total_vendas": int(row.get('total_vendas') or 0),
                "total_ingressos": int(row.get('total_ingressos') or 0),
                "faturamento": float(row.get('faturamento_total') or 0),
                "receita_liquida": float(row.get('receita_liquida') or 0),
            })

        cache.set(cache_key, events, ttl_minutes=15)
        return events

    except Exception as e:
        logger.error(f"[Vendas Upcoming Events] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/event-details/{evento}")
async def get_event_details(evento: str):
    """Retorna detalhes completos de um evento específico"""
    try:
        table_ref = bq_client._get_table_ref('vendas_ingresso')

        cache_key = f"vendas_event_details_{hash(evento)}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Query para métricas gerais do evento
        sql_metrics = f"""
        SELECT
            evento,
            cidade_evento,
            FORMAT_DATE('%Y-%m-%d', data_evento) as data_evento_fmt,
            COUNT(*) as total_vendas,
            SUM(quantidade) as total_ingressos,
            SUM(valor_liquido) as faturamento_total,
            SUM(valor_bruto) as valor_bruto_total,
            SUM(valor_desconto) as desconto_total,
            AVG(valor_liquido / NULLIF(quantidade, 0)) as ticket_medio
        FROM `{table_ref}`
        WHERE evento = '{evento}'
        GROUP BY evento, cidade_evento, data_evento
        LIMIT 1
        """

        metrics_result = bq_client.query(sql_metrics)
        if not metrics_result:
            raise HTTPException(status_code=404, detail="Evento não encontrado")

        metrics = metrics_result[0]

        # Query para vendas por tipo de ingresso
        sql_tipos = f"""
        SELECT
            COALESCE(tipo, 'Não especificado') as tipo,
            SUM(quantidade) as quantidade,
            SUM(valor_liquido) as valor_total
        FROM `{table_ref}`
        WHERE evento = '{evento}'
        GROUP BY tipo
        ORDER BY quantidade DESC
        """

        tipos_result = bq_client.query(sql_tipos)

        # Normalizar e agregar tipos
        tipos_normalized: Dict[str, Dict[str, float]] = {}
        for row in tipos_result:
            tipo_original = row.get('tipo') or 'Não especificado'
            categoria = normalize_ticket_type(tipo_original)
            quantidade = int(row.get('quantidade') or 0)
            valor = float(row.get('valor_total') or 0)

            if categoria not in tipos_normalized:
                tipos_normalized[categoria] = {'quantidade': 0, 'valor': 0}

            tipos_normalized[categoria]['quantidade'] += quantidade
            tipos_normalized[categoria]['valor'] += valor

        tipos = [
            {
                "tipo": categoria,
                "quantidade": int(data['quantidade']),
                "valor": data['valor']
            }
            for categoria, data in tipos_normalized.items()
        ]
        tipos.sort(key=lambda x: x['quantidade'], reverse=True)

        # Query para vendas por dia (últimos 30 dias)
        sql_vendas_dia = f"""
        SELECT
            FORMAT_DATE('%Y-%m-%d', data_venda) as data,
            SUM(quantidade) as quantidade,
            SUM(valor_liquido) as valor
        FROM `{table_ref}`
        WHERE evento = '{evento}'
          AND data_venda IS NOT NULL
          AND data_venda >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY data
        ORDER BY data ASC
        """

        vendas_dia_result = bq_client.query(sql_vendas_dia)
        vendas_dia = [
            {
                "data": row.get('data'),
                "quantidade": int(row.get('quantidade') or 0),
                "valor": float(row.get('valor') or 0)
            }
            for row in vendas_dia_result
        ]

        # Query para vendas por semana (últimas 12 semanas)
        sql_vendas_semana = f"""
        SELECT
            FORMAT_DATE('%Y-W%V', data_venda) as semana,
            MIN(FORMAT_DATE('%Y-%m-%d', data_venda)) as data_inicio,
            SUM(quantidade) as quantidade,
            SUM(valor_liquido) as valor
        FROM `{table_ref}`
        WHERE evento = '{evento}'
          AND data_venda IS NOT NULL
          AND data_venda >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 WEEK)
        GROUP BY semana
        ORDER BY semana ASC
        """

        vendas_semana_result = bq_client.query(sql_vendas_semana)
        vendas_semana = [
            {
                "semana": row.get('semana'),
                "data_inicio": row.get('data_inicio'),
                "quantidade": int(row.get('quantidade') or 0),
                "valor": float(row.get('valor') or 0)
            }
            for row in vendas_semana_result
        ]

        # Query para vendas por ticketeira
        sql_ticketeiras = f"""
        SELECT
            COALESCE(ticketeira, 'Não especificada') as ticketeira,
            SUM(quantidade) as quantidade,
            SUM(valor_liquido) as valor
        FROM `{table_ref}`
        WHERE evento = '{evento}'
        GROUP BY ticketeira
        ORDER BY quantidade DESC
        """

        ticketeiras_result = bq_client.query(sql_ticketeiras)
        ticketeiras = [
            {
                "ticketeira": row.get('ticketeira') or 'Não especificada',
                "quantidade": int(row.get('quantidade') or 0),
                "valor": float(row.get('valor') or 0)
            }
            for row in ticketeiras_result
        ]

        response = {
            "evento": metrics.get('evento'),
            "cidade": metrics.get('cidade_evento') or '',
            "data_evento": metrics.get('data_evento_fmt'),
            "total_vendas": int(metrics.get('total_vendas') or 0),
            "total_ingressos": int(metrics.get('total_ingressos') or 0),
            "faturamento": float(metrics.get('faturamento_total') or 0),
            "valor_bruto": float(metrics.get('valor_bruto_total') or 0),
            "desconto_total": float(metrics.get('desconto_total') or 0),
            "ticket_medio": float(metrics.get('ticket_medio') or 0),
            "tipos_ingresso": tipos,
            "vendas_dia": vendas_dia,
            "vendas_semana": vendas_semana,
            "ticketeiras": ticketeiras
        }

        cache.set(cache_key, response, ttl_minutes=10)
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Vendas Event Details] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from bigquery_client import bq_client
from cache import cache
import logging

router = APIRouter(prefix="/planejamento", tags=["Planejamento"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[Dict[str, Any]])
async def get_planejamento():
    """Retorna dados da tabela planejamento do BigQuery"""
    cache_key = "planejamento_data"

    # Tenta buscar do cache
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        logger.info(f"[Planejamento] Retornando {len(cached_data)} registros do cache")
        return cached_data

    try:
        logger.info(f"[Planejamento] Carregando dados do BigQuery")
        data = bq_client.get_planejamento()

        if not data:
            logger.warning("[Planejamento] ⚠️  Nenhum dado retornado!")
            return []

        logger.info(f"[Planejamento] ✅ Retornou {len(data)} registros")

        # Armazena no cache por 15 minutos (dados de planejamento mudam menos)
        cache.set(cache_key, data, ttl_minutes=15)

        return data
    except Exception as e:
        logger.error(f"[Planejamento] ❌ Erro ao buscar dados: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=Dict[str, Any])
async def get_planejamento_stats():
    """Retorna estatísticas do planejamento"""
    cache_key = "planejamento_stats"

    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    try:
        table_ref = bq_client._get_table_ref('planejamento')

        sql = f"""
        SELECT
            COUNT(*) as total_eventos,
            SUM(CAST(publico_estimado AS INT64)) as publico_total_estimado,
            SUM(CAST(ingressos_validados AS INT64)) as publico_total_validado,
            SUM(CAST(ingressos_emitidos AS INT64)) as ingressos_emitidos_total,
            COUNT(DISTINCT cidade_do_evento) as total_cidades,
            COUNT(DISTINCT base) as total_bases
        FROM `{table_ref}`
        WHERE publico_estimado IS NOT NULL AND publico_estimado != ''
        """

        result_list = bq_client.query(sql, cache_key='planejamento_stats_query')

        if not result_list:
            return {
                "total_eventos": 0,
                "publico_total_estimado": 0,
                "publico_total_validado": 0,
                "ingressos_emitidos_total": 0,
                "total_cidades": 0,
                "total_bases": 0
            }

        result = result_list[0]
        cache.set(cache_key, result, ttl_minutes=15)
        return result
    except Exception as e:
        logger.error(f"[Planejamento Stats] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-city", response_model=List[Dict[str, Any]])
async def get_planejamento_by_city():
    """Retorna eventos agrupados por cidade"""
    try:
        table_ref = bq_client._get_table_ref('planejamento')

        sql = f"""
        SELECT
            cidade_do_evento as cidade,
            COUNT(*) as total_eventos,
            SUM(CAST(publico_estimado AS INT64)) as publico_total,
            SUM(CAST(ingressos_emitidos AS INT64)) as ingressos_emitidos
        FROM `{table_ref}`
        WHERE cidade_do_evento IS NOT NULL AND cidade_do_evento != ''
        GROUP BY cidade_do_evento
        ORDER BY total_eventos DESC
        """

        return bq_client.query(sql, cache_key='planejamento_by_city')
    except Exception as e:
        logger.error(f"[Planejamento By City] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-tipo", response_model=List[Dict[str, Any]])
async def get_planejamento_by_tipo():
    """Retorna eventos agrupados por tipo"""
    try:
        table_ref = bq_client._get_table_ref('planejamento')

        sql = f"""
        SELECT
            atividade as tipo_evento,
            COUNT(*) as total_eventos,
            SUM(CAST(publico_estimado AS INT64)) as publico_total,
            SUM(CAST(ingressos_validados AS INT64)) as ingressos_validados
        FROM `{table_ref}`
        WHERE atividade IS NOT NULL AND atividade != ''
        GROUP BY atividade
        ORDER BY total_eventos DESC
        """

        return bq_client.query(sql, cache_key='planejamento_by_tipo')
    except Exception as e:
        logger.error(f"[Planejamento By Tipo] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reload")
async def reload_data():
    """Limpa cache do BigQuery"""
    try:
        logger.info("[Planejamento] 🔄 Limpando cache...")
        bq_client.clear_cache('planejamento')
        cache.clear()
        logger.info("[Planejamento] ✅ Cache limpo")
        return {"status": "cache_cleared", "table": "planejamento"}
    except Exception as e:
        logger.error(f"[Planejamento] ❌ Erro ao limpar cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

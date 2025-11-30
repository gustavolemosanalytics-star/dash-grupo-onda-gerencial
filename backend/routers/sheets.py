from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import httpx
import pandas as pd
from io import StringIO
from config import settings
from cache import cache
import logging

router = APIRouter(prefix="/sheets", tags=["Google Sheets"])
logger = logging.getLogger(__name__)


async def fetch_google_sheet() -> List[Dict[str, Any]]:
    """Busca dados da planilha do Google Sheets com cache de 30 minutos"""
    cache_key = "google_sheets_data"

    # Tenta buscar do cache
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        logger.info(f"[Sheets] Retornando {len(cached_data)} registros do cache")
        return cached_data

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                settings.google_sheet_url,
                headers={"User-Agent": "Mozilla/5.0"},
                follow_redirects=True
            )

            if response.status_code != 200:
                raise Exception(f"HTTP {response.status_code}: Não foi possível baixar a planilha")

            csv_content = response.text

            if csv_content.strip().startswith('<'):
                raise Exception("Google Sheets retornou HTML ao invés de CSV")

            # Linha 0 = categorias (INFORMAÇÕES GERAIS, etc)
            # Linha 1 = nomes das colunas (Data, Evento, etc)
            # Linha 2+ = dados
            # Usar apenas a linha 1 (índice 1) como header
            df = pd.read_csv(StringIO(csv_content), header=1)

            # Substituir valores inválidos (NaN, Inf, -Inf) por None
            df = df.replace([float('inf'), float('-inf')], None)
            df = df.where(pd.notnull(df), None)

            data = df.to_dict('records')

            # Armazena no cache por 30 minutos
            cache.set(cache_key, data, ttl_minutes=30)
            logger.info(f"[Sheets] Buscou {len(data)} registros do Google Sheets e armazenou no cache")

            return data

    except Exception as e:
        logger.error(f"[Sheets] Erro ao buscar planilha: {e}")
        return []


@router.get("/", response_model=List[Dict[str, Any]])
async def get_sheet_data():
    """Retorna dados da planilha do Google Sheets (com cache de 30 minutos)"""
    try:
        data = await fetch_google_sheet()
        logger.info(f"[Sheets] Retornou {len(data)} registros")
        return data
    except Exception as e:
        logger.error(f"[Sheets] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

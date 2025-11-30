"""
Endpoints agregados para Vendas de Ingresso - processa CSV no backend
Retorna apenas dados sumarizados necessários para o dashboard
"""
from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import pandas as pd
import logging
from typing import List, Dict, Any, Optional
from cache import cache

router = APIRouter(prefix="/vendas-aggregated", tags=["Vendas Aggregated"])
logger = logging.getLogger(__name__)

CSV_DIR = Path(__file__).parent.parent / "data"
CSV_PATH = CSV_DIR / "vendas_ingresso.csv"


def load_vendas_data() -> pd.DataFrame:
    """Carrega dados do CSV com cache"""
    cache_key = "vendas_dataframe"

    cached = cache.get(cache_key)
    if cached is not None:
        logger.info(f"[Vendas Aggregated] Usando cache ({len(cached)} linhas)")
        return cached

    logger.info("[Vendas Aggregated] Carregando CSV...")

    # Carregar colunas necessárias incluindo campos de filtro
    df = pd.read_csv(
        CSV_PATH,
        usecols=[
            'id', 'id_onda', 'nome', 'evento', 'data_evento', 'data_venda',
            'quantidade', 'valor_bruto', 'valor_liquido', 'valor_desconto',
            'ticketeira', 'tipo', 'setor', 'forma_pagamento', 'status',
            'cidade_evento', 'uf_evento', 'base_responsavel', 'cidade'
        ],
        dtype={
            'id': 'str',
            'id_onda': 'str',
            'nome': 'str',
            'evento': 'str',
            'ticketeira': 'str',
            'tipo': 'str',
            'setor': 'str',
            'forma_pagamento': 'str',
            'status': 'str',
            'cidade_evento': 'str',
            'uf_evento': 'str',
            'base_responsavel': 'str',
            'cidade': 'str',
        },
        parse_dates=['data_evento', 'data_venda']
    )

    # Substituir NaN por valores padrão
    df['valor_liquido'] = pd.to_numeric(df['valor_liquido'], errors='coerce').fillna(0)
    df['valor_bruto'] = pd.to_numeric(df['valor_bruto'], errors='coerce').fillna(0)
    df['valor_desconto'] = pd.to_numeric(df['valor_desconto'], errors='coerce').fillna(0)
    df['quantidade'] = pd.to_numeric(df['quantidade'], errors='coerce').fillna(1)

    # Cache por 30 minutos
    cache.set(cache_key, df, ttl_minutes=30)

    logger.info(f"[Vendas Aggregated] Carregado {len(df)} linhas")
    return df


def apply_filters(df: pd.DataFrame, cidade: Optional[str] = None, evento: Optional[str] = None,
                  base_responsavel: Optional[str] = None, ticketeira: Optional[str] = None,
                  data_evento: Optional[str] = None) -> pd.DataFrame:
    """Aplica filtros ao dataframe"""
    filtered_df = df.copy()

    if cidade:
        filtered_df = filtered_df[filtered_df['cidade_evento'] == cidade]

    if evento:
        filtered_df = filtered_df[filtered_df['evento'] == evento]

    if base_responsavel:
        filtered_df = filtered_df[filtered_df['base_responsavel'] == base_responsavel]

    if ticketeira:
        filtered_df = filtered_df[filtered_df['ticketeira'] == ticketeira]

    if data_evento:
        # Converter string para datetime e comparar apenas a data
        filtered_df = filtered_df[filtered_df['data_evento'].dt.strftime('%Y-%m-%d') == data_evento]

    return filtered_df


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
        df = load_vendas_data()
        df = apply_filters(df, cidade, evento, base_responsavel, ticketeira, data_evento)

        total_ingressos = int(df['quantidade'].sum())
        total_receita = float(df['valor_liquido'].sum())
        ticket_medio = float(total_receita / total_ingressos) if total_ingressos > 0 else 0

        return {
            "total_vendas": int(len(df)),
            "total_ingressos": total_ingressos,
            "total_receita": total_receita,
            "ticket_medio": ticket_medio
        }
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
        df = load_vendas_data()
        df = apply_filters(df, cidade, evento, base_responsavel, ticketeira, data_evento)

        grouped = df.groupby('evento').agg({
            'quantidade': 'sum',
            'valor_liquido': 'sum'
        }).reset_index()

        # Ordenar por receita
        top = grouped.nlargest(limit, 'valor_liquido')

        return [
            {
                "name": row['evento'],
                "Receita": float(row['valor_liquido']),
                "Ingressos": int(row['quantidade'])
            }
            for _, row in top.iterrows()
        ]
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
        df = load_vendas_data()
        df = apply_filters(df, cidade, evento, base_responsavel, ticketeira, data_evento)

        df['ticketeira'] = df['ticketeira'].fillna('Não especificado')

        grouped = df.groupby('ticketeira').agg({
            'quantidade': 'sum',
            'valor_liquido': 'sum'
        }).reset_index()

        # Ordenar por receita
        grouped = grouped.sort_values('valor_liquido', ascending=False)

        return [
            {
                "label": row['ticketeira'],
                "value": float(row['valor_liquido']),
                "quantity": int(row['quantidade'])
            }
            for _, row in grouped.iterrows()
        ]
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
        df = load_vendas_data()
        df = apply_filters(df, cidade, evento, base_responsavel, ticketeira, data_evento)

        df['tipo'] = df['tipo'].fillna('Não especificado')

        grouped = df.groupby('tipo').agg({
            'valor_liquido': 'sum'
        }).reset_index()

        # Ordenar por receita
        grouped = grouped.sort_values('valor_liquido', ascending=False)

        return [
            {
                "name": row['tipo'],
                "value": float(row['valor_liquido'])
            }
            for _, row in grouped.iterrows()
        ]
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
        df = load_vendas_data()
        df = apply_filters(df, cidade, evento, base_responsavel, ticketeira, data_evento)

        # Ordenar por data de venda (mais recentes primeiro)
        df = df.sort_values('data_venda', ascending=False)

        # Pegar as primeiras N
        recent = df.head(limit)

        return [
            {
                "id": row['id'],
                "evento": row['evento'],
                "tipo": row['tipo'],
                "ticketeira": row['ticketeira'],
                "quantidade": int(row['quantidade']),
                "valor_unitario": float(row['valor_liquido'] / row['quantidade']) if row['quantidade'] > 0 else 0,
                "valor_liquido": float(row['valor_liquido']),
                "status": row['status']
            }
            for _, row in recent.iterrows()
        ]
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
        df = load_vendas_data()

        # Aplicar filtros para obter opções dinâmicas
        df = apply_filters(df, cidade, evento, base_responsavel, ticketeira, data_evento)

        # Extrair valores únicos para cada filtro
        cidades = sorted(df['cidade_evento'].dropna().unique().tolist())
        eventos = sorted(df['evento'].dropna().unique().tolist())
        bases = sorted(df['base_responsavel'].dropna().unique().tolist())
        ticketeiras = sorted(df['ticketeira'].dropna().unique().tolist())

        # Para datas, converter para formato dd/mm/yyyy
        datas_evento = df['data_evento'].dropna().dt.strftime('%d/%m/%Y').unique().tolist()
        datas_evento = sorted(set(datas_evento))

        return {
            "cidades": cidades,
            "eventos": eventos,
            "bases": bases,
            "ticketeiras": ticketeiras,
            "datas_evento": datas_evento
        }
    except Exception as e:
        logger.error(f"[Vendas Filters] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

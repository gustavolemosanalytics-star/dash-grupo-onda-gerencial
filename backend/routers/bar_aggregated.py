"""
Endpoints agregados para Bar - processa CSV no backend
Retorna apenas dados sumarizados necessários para o dashboard
"""
from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import pandas as pd
import logging
from typing import List, Dict, Any, Optional
from cache import cache

router = APIRouter(prefix="/bar-aggregated", tags=["Bar Aggregated"])
logger = logging.getLogger(__name__)

CSV_DIR = Path(__file__).parent.parent / "data"
CSV_PATH = CSV_DIR / "bar_zig.csv"


def load_bar_data() -> pd.DataFrame:
    """Carrega dados do CSV com cache"""
    cache_key = "bar_dataframe"

    cached = cache.get(cache_key)
    if cached is not None:
        logger.info(f"[Bar Aggregated] Usando cache ({len(cached)} linhas)")
        return cached

    logger.info("[Bar Aggregated] Carregando CSV...")

    # Carregar colunas necessárias incluindo campos de filtro
    df = pd.read_csv(
        CSV_PATH,
        usecols=[
            'transactionId', 'transactionDate', 'productName',
            'productCategory', 'count', 'unitValue', 'discountValue',
            'eventName', 'eventDate', 'employeeName', '_evento_tipo'
        ],
        dtype={
            'transactionId': 'str',
            'productName': 'str',
            'productCategory': 'str',
            'eventName': 'str',
            'employeeName': 'str',
            '_evento_tipo': 'str',
        },
        parse_dates=['transactionDate', 'eventDate']
    )

    # Substituir NaN por valores padrão e converter centavos para reais
    df['unitValue'] = pd.to_numeric(df['unitValue'], errors='coerce').fillna(0) / 100
    df['discountValue'] = pd.to_numeric(df['discountValue'], errors='coerce').fillna(0) / 100
    df['count'] = pd.to_numeric(df['count'], errors='coerce').fillna(1)

    # Cache por 30 minutos
    cache.set(cache_key, df, ttl_minutes=30)

    logger.info(f"[Bar Aggregated] Carregado {len(df)} linhas")
    return df


def apply_filters(df: pd.DataFrame, evento_tipo: Optional[str] = None,
                  event_name: Optional[str] = None, event_date: Optional[str] = None) -> pd.DataFrame:
    """Aplica filtros ao dataframe"""
    filtered_df = df.copy()

    if evento_tipo:
        filtered_df = filtered_df[filtered_df['_evento_tipo'] == evento_tipo]

    if event_name:
        filtered_df = filtered_df[filtered_df['eventName'] == event_name]

    if event_date:
        # Converter string para datetime e comparar apenas a data
        filtered_df = filtered_df[filtered_df['eventDate'].dt.strftime('%Y-%m-%d') == event_date]

    return filtered_df


@router.get("/metrics")
async def get_metrics(
    evento_tipo: Optional[str] = Query(None),
    event_name: Optional[str] = Query(None),
    event_date: Optional[str] = Query(None)
):
    """Retorna métricas principais do bar com filtros opcionais"""
    try:
        df = load_bar_data()
        df = apply_filters(df, evento_tipo, event_name, event_date)

        # Calcular receita
        df['revenue'] = (df['unitValue'] * df['count']) - df['discountValue']

        return {
            "total_transactions": int(len(df)),
            "total_revenue": float(df['revenue'].sum()),
            "total_products_sold": int(df['count'].sum()),
            "avg_ticket": float(df['revenue'].sum() / len(df)) if len(df) > 0 else 0
        }
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
        df = load_bar_data()
        df = apply_filters(df, evento_tipo, event_name, event_date)

        df['revenue'] = (df['unitValue'] * df['count']) - df['discountValue']
        df['date'] = df['transactionDate'].dt.date

        grouped = df.groupby('date').agg({
            'revenue': 'sum',
            'count': 'sum'
        }).reset_index()

        # Ordenar por data
        grouped = grouped.sort_values('date')

        # Formatar datas
        grouped['date'] = grouped['date'].astype(str)

        return grouped.to_dict('records')
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
        df = load_bar_data()
        df = apply_filters(df, evento_tipo, event_name, event_date)

        df['revenue'] = (df['unitValue'] * df['count']) - df['discountValue']

        grouped = df.groupby('productName').agg({
            'revenue': 'sum',
            'count': 'sum'
        }).reset_index()

        # Ordenar e limitar
        top = grouped.nlargest(limit, 'revenue')

        return [
            {
                "name": row['productName'],
                "revenue": float(row['revenue']),
                "quantity": int(row['count'])
            }
            for _, row in top.iterrows()
        ]
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
        df = load_bar_data()
        df = apply_filters(df, evento_tipo, event_name, event_date)

        df['revenue'] = (df['unitValue'] * df['count']) - df['discountValue']
        df['productCategory'] = df['productCategory'].fillna('Sem categoria')

        grouped = df.groupby('productCategory').agg({
            'revenue': 'sum'
        }).reset_index()

        # Ordenar por receita
        grouped = grouped.sort_values('revenue', ascending=False)

        return [
            {
                "name": row['productCategory'],
                "revenue": float(row['revenue'])
            }
            for _, row in grouped.iterrows()
        ]
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
        df = load_bar_data()
        df = apply_filters(df, evento_tipo, event_name, event_date)

        # Ordenar por data (mais recentes primeiro)
        df = df.sort_values('transactionDate', ascending=False)

        # Pegar as primeiras N
        recent = df.head(limit)

        # Calcular total
        recent['total'] = (recent['unitValue'] * recent['count']) - recent['discountValue']

        return [
            {
                "id": row['transactionId'],
                "transactionDate": row['transactionDate'].isoformat() if pd.notna(row['transactionDate']) else None,
                "productName": row['productName'],
                "productCategory": row['productCategory'],
                "eventName": row['eventName'],
                "count": int(row['count']),
                "unitValue": float(row['unitValue']),
                "discountValue": float(row['discountValue']),
                "total": float(row['total'])
            }
            for _, row in recent.iterrows()
        ]
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
        df = load_bar_data()

        # Aplicar filtros para obter opções dinâmicas
        df = apply_filters(df, evento_tipo, event_name, event_date)

        # Extrair valores únicos para cada filtro
        tipos = sorted(df['_evento_tipo'].dropna().unique().tolist())
        events = sorted(df['eventName'].dropna().unique().tolist())

        # Para datas, converter para formato dd/mm/yyyy
        event_dates = df['eventDate'].dropna().dt.strftime('%d/%m/%Y').unique().tolist()
        event_dates = sorted(set(event_dates))

        return {
            "tipos": tipos,
            "events": events,
            "event_dates": event_dates
        }
    except Exception as e:
        logger.error(f"[Bar Filters] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

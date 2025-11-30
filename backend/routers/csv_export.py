"""
Endpoints para exportação de dados em formato CSV
Otimizado para grandes volumes de dados
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from typing import Generator
from pathlib import Path
import logging
import os

router = APIRouter(prefix="/csv", tags=["CSV Export"])
logger = logging.getLogger(__name__)

# Diretório dos CSVs
CSV_DIR = Path(__file__).parent.parent / "data"


@router.get("/bar-zig")
async def export_bar_zig_csv():
    """
    Endpoint para download do CSV de bar_zig
    Retorna arquivo local diretamente
    """
    try:
        csv_path = CSV_DIR / "bar_zig.csv"

        if not csv_path.exists():
            raise HTTPException(status_code=404, detail="Arquivo bar_zig.csv não encontrado")

        logger.info(f"[CSV Export] Servindo bar_zig.csv ({csv_path.stat().st_size / 1024 / 1024:.1f} MB)")

        return FileResponse(
            path=str(csv_path),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=bar_zig.csv",
                "Cache-Control": "max-age=3600"  # Cache de 1 hora
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CSV Export] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vendas-ingresso")
async def export_vendas_ingresso_csv():
    """
    Endpoint para download do CSV de vendas_ingresso
    Retorna arquivo local diretamente
    """
    try:
        csv_path = CSV_DIR / "vendas_ingresso.csv"

        if not csv_path.exists():
            raise HTTPException(status_code=404, detail="Arquivo vendas_ingresso.csv não encontrado")

        logger.info(f"[CSV Export] Servindo vendas_ingresso.csv ({csv_path.stat().st_size / 1024:.1f} KB)")

        return FileResponse(
            path=str(csv_path),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=vendas_ingresso.csv",
                "Cache-Control": "max-age=3600"  # Cache de 1 hora
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CSV Export] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bar-zig/metadata")
async def get_bar_zig_metadata():
    """
    Retorna metadados do arquivo bar_zig.csv
    Usado para verificar se o CSV precisa ser recarregado
    """
    try:
        csv_path = CSV_DIR / "bar_zig.csv"

        if not csv_path.exists():
            raise HTTPException(status_code=404, detail="Arquivo bar_zig.csv não encontrado")

        # Contar linhas (aproximado, rápido)
        with open(csv_path, 'r', encoding='utf-8') as f:
            # Pular header
            next(f)
            total_rows = sum(1 for _ in f)

        # Info do arquivo
        stat = csv_path.stat()

        return {
            "total_rows": total_rows,
            "file_size_mb": round(stat.st_size / 1024 / 1024, 2),
            "last_modified": stat.st_mtime,
            "csv_url": "/api/csv/bar-zig"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CSV Metadata] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vendas-ingresso/metadata")
async def get_vendas_ingresso_metadata():
    """
    Retorna metadados do arquivo vendas_ingresso.csv
    """
    try:
        csv_path = CSV_DIR / "vendas_ingresso.csv"

        if not csv_path.exists():
            raise HTTPException(status_code=404, detail="Arquivo vendas_ingresso.csv não encontrado")

        # Contar linhas
        with open(csv_path, 'r', encoding='utf-8') as f:
            # Pular header
            next(f)
            total_rows = sum(1 for _ in f)

        # Info do arquivo
        stat = csv_path.stat()

        return {
            "total_rows": total_rows,
            "file_size_kb": round(stat.st_size / 1024, 2),
            "last_modified": stat.st_mtime,
            "csv_url": "/api/csv/vendas-ingresso"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CSV Metadata] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    google_sheet_url: Optional[str] = "https://docs.google.com/spreadsheets/d/1t1KVI9E6GanMnrNR55U0ssM46GBiWN_d5Ux9qVACDi8/export?format=csv"
    port: int = 4000
    debug: bool = False
    csv_bar_path: str = "./backend/data/bar_zig_rows.csv"
    csv_vendas_path: str = "./backend/data/vendas_ingresso_rows.csv"

    class Config:
        # Busca o .env na raiz do projeto (um nível acima de backend/)
        env_file = Path(__file__).parent.parent / ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = False
        extra = "ignore"  # Ignora variáveis extras do .env


settings = Settings()

logger.info(f"✅ Configurações carregadas - CSV Mode")

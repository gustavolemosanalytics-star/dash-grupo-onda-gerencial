from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    postgres_url: str = ""
    google_sheet_url: Optional[str] = "https://docs.google.com/spreadsheets/d/1t1KVI9E6GanMnrNR55U0ssM46GBiWN_d5Ux9qVACDi8/export?format=csv"
    port: int = 4000
    debug: bool = False

    class Config:
        # Busca o .env na raiz do projeto (um nível acima de backend/)
        env_file = Path(__file__).parent.parent / ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = False
        extra = "ignore"  # Ignora variáveis extras do .env


settings = Settings()

# Validação na inicialização
if not settings.postgres_url:
    logger.critical(
        "❌ POSTGRES_URL não está configurada!\n"
        "   Crie um arquivo .env na raiz do projeto com:\n"
        "   POSTGRES_URL=postgresql://user:password@host:5432/database"
    )
    raise RuntimeError("POSTGRES_URL environment variable is required")

# Validação de formato
if not settings.postgres_url.startswith(('postgresql://', 'postgres://')):
    logger.warning(
        "⚠️  POSTGRES_URL parece malformada. Certifique-se que começa com 'postgresql://' ou 'postgres://'"
    )

logger.info(f"✅ Database URL validada (host: {settings.postgres_url.split('@')[1].split(':')[0] if '@' in settings.postgres_url else 'unknown'})")

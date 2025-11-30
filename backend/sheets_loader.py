"""
Google Sheets Loader
Carrega dados direto das planilhas do Google Sheets
"""

import pandas as pd
import logging
import os
from typing import List, Dict, Any
from datetime import datetime
import requests
from io import StringIO

logger = logging.getLogger(__name__)

class SheetsLoader:
    """Carrega e cacheia dados do Google Sheets"""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.bar_url = os.getenv('GOOGLE_SHEET_BAR_URL')
        self.vendas_url = os.getenv('GOOGLE_SHEET_VENDAS_URL')

    def load_sheet(self, sheet_type: str, force_reload: bool = False) -> List[Dict[str, Any]]:
        """
        Carrega dados do Google Sheets
        sheet_type: 'bar' ou 'vendas'
        """
        if not force_reload and sheet_type in self._cache:
            logger.info(f"[SHEETS] Usando cache para {sheet_type}")
            return self._cache[sheet_type]['data']

        # Determina URL
        if sheet_type == 'bar':
            url = self.bar_url
        elif sheet_type == 'vendas':
            url = self.vendas_url
        else:
            logger.error(f"[SHEETS] Tipo inválido: {sheet_type}")
            return []

        if not url:
            logger.error(f"[SHEETS] URL não configurada para {sheet_type}")
            return []

        try:
            logger.info(f"[SHEETS] Baixando {sheet_type} do Google Sheets...")

            # Fazer request com timeout
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            # Parse CSV
            csv_data = StringIO(response.text)
            df = pd.read_csv(csv_data)

            # Converter Decimal/float columns
            numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
            for col in numeric_cols:
                df[col] = df[col].apply(lambda x: float(x) if pd.notna(x) else None)

            # Converter datetime columns
            date_cols = [col for col in df.columns if 'date' in col.lower() or 'data' in col.lower()]
            for col in date_cols:
                try:
                    df[col] = pd.to_datetime(df[col], utc=True)
                except Exception:
                    pass

            # Converter para lista de dicts
            data = df.to_dict('records')

            # Armazenar em cache
            self._cache[sheet_type] = {
                'data': data,
                'loaded_at': datetime.now(),
                'row_count': len(data)
            }

            logger.info(f"[SHEETS] ✅ {sheet_type} carregado com {len(data)} linhas")
            return data

        except requests.RequestException as e:
            logger.error(f"[SHEETS] ❌ Erro ao baixar {sheet_type}: {e}")
            return []
        except Exception as e:
            logger.error(f"[SHEETS] ❌ Erro ao processar {sheet_type}: {e}", exc_info=True)
            return []

    def reload(self, sheet_type: str):
        """Força recarga do Google Sheet"""
        if sheet_type in self._cache:
            del self._cache[sheet_type]
        return self.load_sheet(sheet_type, force_reload=True)

    def get_cache_info(self, sheet_type: str) -> Dict[str, Any]:
        """Retorna informações de cache"""
        if sheet_type not in self._cache:
            return {"status": "not_loaded"}

        cache_entry = self._cache[sheet_type]
        return {
            "status": "cached",
            "row_count": cache_entry['row_count'],
            "loaded_at": cache_entry['loaded_at'].isoformat()
        }

# Instância global
sheets_loader = SheetsLoader()

import pandas as pd
import logging
import gzip
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Caminho para arquivos CSV
CSV_DIR = Path(__file__).parent / "data"
CSV_DIR.mkdir(exist_ok=True)

class CSVLoader:
    """Carrega e cacheia dados de arquivos CSV"""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def load_csv(self, filename: str, force_reload: bool = False) -> List[Dict[str, Any]]:
        """Carrega CSV e retorna como lista de dicts (suporta .gz)"""
        filepath = CSV_DIR / filename

        if not force_reload and filename in self._cache:
            logger.info(f"[CSV] Usando cache para {filename}")
            return self._cache[filename]['data']

        # Tenta arquivos .gz se o arquivo original não existir
        if not filepath.exists():
            gz_filepath = CSV_DIR / f"{filename}.gz"
            if gz_filepath.exists():
                filepath = gz_filepath
                logger.info(f"[CSV] Usando arquivo comprimido {filepath.name}")
            else:
                logger.error(f"[CSV] ❌ Arquivo não encontrado: {filename} ou {filename}.gz")
                return []

        try:
            logger.info(f"[CSV] Carregando {filepath.name}...")

            # Detecta se é arquivo comprimido
            if filepath.suffix == '.gz':
                with gzip.open(filepath, 'rt', encoding='utf-8') as f:
                    df = pd.read_csv(f)
            else:
                df = pd.read_csv(filepath)

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
                    pass  # Se não conseguir converter, deixa como string

            # Converter para lista de dicts
            data = df.to_dict('records')

            # Armazenar em cache
            self._cache[filename] = {
                'data': data,
                'loaded_at': datetime.now(),
                'row_count': len(data)
            }

            logger.info(f"[CSV] ✅ {filename} carregado com {len(data)} linhas")
            return data

        except Exception as e:
            logger.error(f"[CSV] ❌ Erro ao carregar {filename}: {e}", exc_info=True)
            return []

    def reload(self, filename: str):
        """Força recarga do arquivo"""
        if filename in self._cache:
            del self._cache[filename]
        return self.load_csv(filename, force_reload=True)

    def get_cache_info(self, filename: str) -> Dict[str, Any]:
        """Retorna informações de cache"""
        if filename not in self._cache:
            return {"status": "not_loaded"}

        cache_entry = self._cache[filename]
        return {
            "status": "cached",
            "row_count": cache_entry['row_count'],
            "loaded_at": cache_entry['loaded_at'].isoformat()
        }

# Instância global
csv_loader = CSVLoader()


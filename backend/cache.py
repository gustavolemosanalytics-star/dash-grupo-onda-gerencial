"""Sistema de cache simples em memória para otimizar performance"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class SimpleCache:
    """Cache simples em memória com expiração de tempo"""

    def __init__(self, default_ttl_minutes: int = 5):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = timedelta(minutes=default_ttl_minutes)

    def get(self, key: str) -> Optional[Any]:
        """Retorna valor do cache se ainda estiver válido"""
        if key not in self._cache:
            return None

        cache_entry = self._cache[key]
        if datetime.now() > cache_entry['expires_at']:
            # Cache expirado, remove
            del self._cache[key]
            logger.info(f"[Cache] Cache expirado: {key}")
            return None

        logger.info(f"[Cache] Cache hit: {key}")
        return cache_entry['value']

    def set(self, key: str, value: Any, ttl_minutes: Optional[int] = None):
        """Armazena valor no cache"""
        ttl = timedelta(minutes=ttl_minutes) if ttl_minutes else self.default_ttl
        self._cache[key] = {
            'value': value,
            'expires_at': datetime.now() + ttl,
            'created_at': datetime.now()
        }
        logger.info(f"[Cache] Cache armazenado: {key} (TTL: {ttl_minutes or 5} min)")

    def clear(self):
        """Limpa todo o cache"""
        self._cache.clear()
        logger.info("[Cache] Cache limpo")

    def clear_expired(self):
        """Remove apenas entradas expiradas"""
        now = datetime.now()
        expired_keys = [
            key for key, entry in self._cache.items()
            if now > entry['expires_at']
        ]
        for key in expired_keys:
            del self._cache[key]

        if expired_keys:
            logger.info(f"[Cache] Removidas {len(expired_keys)} entradas expiradas")

# Instância global do cache
cache = SimpleCache(default_ttl_minutes=5)  # Cache de 5 minutos por padrão

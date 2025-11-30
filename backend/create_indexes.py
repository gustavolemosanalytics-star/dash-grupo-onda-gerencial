#!/usr/bin/env python3
"""Script para criar índices no banco de dados para melhorar performance"""

import psycopg2
from config import settings
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def create_indexes():
    """Cria índices nas tabelas para melhorar performance das queries"""
    try:
        # Usa autocommit para permitir CREATE INDEX CONCURRENTLY
        conn = psycopg2.connect(settings.postgres_url)
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        logger.info("🔧 Criando índices no banco de dados...")

        # Índices para a tabela bar_zig (sem CONCURRENTLY para ser mais rápido)
        indexes_bar = [
            'CREATE INDEX IF NOT EXISTS idx_bar_product_name ON bar_zig("productName");',
            'CREATE INDEX IF NOT EXISTS idx_bar_event_name ON bar_zig("eventName");',
            'CREATE INDEX IF NOT EXISTS idx_bar_category ON bar_zig("productCategory");',
            'CREATE INDEX IF NOT EXISTS idx_bar_transaction_date ON bar_zig("transactionDate");',
        ]

        # Índices para a tabela vendas_ingresso
        indexes_vendas = [
            'CREATE INDEX IF NOT EXISTS idx_vendas_evento ON vendas_ingresso(evento);',
            'CREATE INDEX IF NOT EXISTS idx_vendas_ticketeira ON vendas_ingresso(ticketeira);',
            'CREATE INDEX IF NOT EXISTS idx_vendas_tipo ON vendas_ingresso(tipo);',
            'CREATE INDEX IF NOT EXISTS idx_vendas_data_evento ON vendas_ingresso(data_evento);',
            'CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas_ingresso(data_venda);',
        ]

        all_indexes = indexes_bar + indexes_vendas

        for i, index_sql in enumerate(all_indexes, 1):
            index_name = index_sql.split('idx_')[1].split(' ')[0] if 'idx_' in index_sql else f"index_{i}"
            logger.info(f"[{i}/{len(all_indexes)}] Criando índice: {index_name}...")
            try:
                cursor.execute(index_sql)
                logger.info(f"✅ Índice {index_name} criado com sucesso")
            except Exception as e:
                logger.warning(f"⚠️  Índice {index_name} já existe ou erro: {e}")

        cursor.close()
        conn.close()

        logger.info("✅ Todos os índices foram processados!")
        logger.info("ℹ️  As queries agora devem ser muito mais rápidas.")

    except Exception as e:
        logger.error(f"❌ Erro ao criar índices: {e}")
        raise

if __name__ == "__main__":
    create_indexes()

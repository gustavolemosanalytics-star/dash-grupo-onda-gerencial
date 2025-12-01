"""
BigQuery Client
Conecta e consulta tabelas do BigQuery
"""

import os
import logging
from typing import List, Dict, Any
from datetime import datetime
from google.cloud import bigquery
from google.api_core import exceptions

logger = logging.getLogger(__name__)

class BigQueryClient:
    """Cliente para consultas no BigQuery"""

    def __init__(self):
        self.project_id = os.getenv('GCP_PROJECT_ID', 'cortex-analytics-479819')
        self.dataset_id = os.getenv('BIGQUERY_DATASET', 'grupo_onda')

        try:
            self.client = bigquery.Client(project=self.project_id)
            logger.info(f"[BIGQUERY] ✅ Conectado ao projeto {self.project_id}")
        except Exception as e:
            logger.error(f"[BIGQUERY] ❌ Erro ao conectar: {e}")
            self.client = None

        self._cache: Dict[str, Dict[str, Any]] = {}

    def _get_table_ref(self, table_name: str) -> str:
        """Retorna referência completa da tabela"""
        return f"{self.project_id}.{self.dataset_id}.{table_name}"

    def query(self, sql: str, use_cache: bool = True, cache_key: str = None) -> List[Dict[str, Any]]:
        """
        Executa query SQL no BigQuery

        Args:
            sql: Query SQL a ser executada
            use_cache: Se deve usar cache (padrão: True)
            cache_key: Chave para cache (padrão: hash da query)

        Returns:
            Lista de dicionários com os resultados
        """
        if not self.client:
            logger.error("[BIGQUERY] Cliente não inicializado")
            return []

        # Cache
        if cache_key is None:
            cache_key = hash(sql)

        if use_cache and cache_key in self._cache:
            logger.info(f"[BIGQUERY] Usando cache para query")
            return self._cache[cache_key]['data']

        try:
            logger.info(f"[BIGQUERY] Executando query...")

            # Executa query
            query_job = self.client.query(sql)
            results = query_job.result()

            # Converte para lista de dicts
            data = []
            for row in results:
                row_dict = dict(row.items())

                # Converte tipos especiais
                for key, value in row_dict.items():
                    if isinstance(value, datetime):
                        row_dict[key] = value.isoformat()
                    elif hasattr(value, 'isoformat'):  # DATE objects
                        row_dict[key] = value.isoformat()

                data.append(row_dict)

            # Cache
            if use_cache:
                self._cache[cache_key] = {
                    'data': data,
                    'cached_at': datetime.now(),
                    'row_count': len(data)
                }

            logger.info(f"[BIGQUERY] ✅ Query executada: {len(data)} linhas")
            return data

        except exceptions.NotFound:
            logger.error(f"[BIGQUERY] ❌ Tabela não encontrada")
            return []
        except Exception as e:
            logger.error(f"[BIGQUERY] ❌ Erro na query: {e}")
            return []

    def get_planejamento(self) -> List[Dict[str, Any]]:
        """Busca dados da tabela planejamento (novo schema)"""
        table_ref = self._get_table_ref('planejamento')

        sql = f"""
        SELECT
            data,
            dia_da_semana,
            base,
            atividade,
            evento,
            status_das_atracoes,
            lider_do_evento,
            cidade_do_evento,
            estado,
            socios_no_evento,
            local_do_evento,
            ticketeira,
            adm_tickeira_onda,
            atracoes,
            pct_grupo_onda,
            meta_grupo_onda,
            evento_realizado,
            pct_patrocinio,
            publico_estimado,
            ingressos_emitidos,
            ingressos_validados,
            no_show,
            cortesias_emitidas,
            ingressos_permuta,
            prestadores_de_servico
        FROM `{table_ref}`
        ORDER BY data DESC
        """

        return self.query(sql, cache_key='planejamento')

    def get_bar_zig(self, limit: int = None) -> List[Dict[str, Any]]:
        """
        Busca dados da tabela bar_zig

        Args:
            limit: Limite de registros (None = todos)
        """
        table_ref = self._get_table_ref('bar_zig')

        limit_clause = f"LIMIT {limit}" if limit else ""

        sql = f"""
        SELECT
            transactionId,
            transactionDate,
            invoiceId,
            productId,
            productSku,
            productName,
            productCategory,
            unitValue,
            count,
            fractionalAmount,
            fractionUnit,
            discountValue,
            (unitValue * count - IFNULL(discountValue, 0)) as total_value,
            redeId,
            lojaId,
            barId,
            barName,
            eventId,
            eventName,
            eventDate,
            employeeName,
            type,
            source,
            additions,
            isRefunded,
            _evento_nome,
            _evento_data,
            _evento_loja_id,
            _evento_tipo,
            _store_id,
            obs,
            created_at,
            updated_at
        FROM `{table_ref}`
        WHERE isRefunded = FALSE
        ORDER BY transactionDate DESC
        {limit_clause}
        """

        cache_key = f'bar_zig_limit_{limit}' if limit else 'bar_zig_all'
        return self.query(sql, cache_key=cache_key)

    def get_vendas_ingresso(self, limit: int = None) -> List[Dict[str, Any]]:
        """
        Busca dados da tabela vendas_ingresso

        Args:
            limit: Limite de registros (None = todos)
        """
        table_ref = self._get_table_ref('vendas_ingresso')

        limit_clause = f"LIMIT {limit}" if limit else ""

        sql = f"""
        SELECT
            id,
            created_at,
            id_onda,
            nome,
            cpf,
            rg,
            email,
            telefone,
            data_nascimento,
            idade,
            bairro,
            cidade,
            id_ibge_cidade,
            estado,
            genero1,
            genero2,
            ticketeira,
            evento,
            data_evento,
            data_venda,
            hora_venda,
            quantidade,
            valor_bruto,
            valor_liquido,
            valor_desconto,
            forma_pagamento,
            tipo,
            lote,
            setor,
            status,
            comissario,
            cidade_evento,
            uf_evento,
            base_responsavel,
            parcelamento,
            percentual_desconto,
            nome_arquivo,
            id_cliente_onda,
            id_evento
        FROM `{table_ref}`
        ORDER BY data_venda DESC
        {limit_clause}
        """

        cache_key = f'vendas_ingresso_limit_{limit}' if limit else 'vendas_ingresso_all'
        return self.query(sql, cache_key=cache_key)

    def clear_cache(self, table_name: str = None):
        """
        Limpa cache

        Args:
            table_name: Nome da tabela (None = limpa tudo)
        """
        if table_name:
            # Remove apenas cache da tabela específica
            keys_to_remove = [k for k in self._cache.keys() if table_name in str(k)]
            for key in keys_to_remove:
                del self._cache[key]
            logger.info(f"[BIGQUERY] Cache limpo para {table_name}")
        else:
            self._cache.clear()
            logger.info(f"[BIGQUERY] Cache limpo completamente")

    def get_cache_info(self) -> Dict[str, Any]:
        """Retorna informações sobre o cache"""
        return {
            "cached_queries": len(self._cache),
            "tables": list(set(str(k).split('_')[0] for k in self._cache.keys())),
            "total_rows_cached": sum(v.get('row_count', 0) for v in self._cache.values())
        }

# Instância global
bq_client = BigQueryClient()

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
        SELECT *
        FROM `{table_ref}`
        ORDER BY data DESC
        """

        raw_data = self.query(sql, cache_key='planejamento')

        # Mapeamento de nomes de campos para o formato que o frontend espera
        field_mapping = {
            'data': 'Data',
            'dia_da_semana': 'Dia da Semana',
            'base': 'Base',
            'atividade': 'Atividade',
            'evento': 'Evento',
            'status_das_atracoes': 'Status das Atrações',
            'lider_do_evento': 'Líder do Evento',
            'cidade_do_evento': 'Cidade do Evento',
            'estado': 'Estado',
            'socios_no_evento': 'Sócios no Evento',
            'local_do_evento': 'Local do Evento',
            'ticketeira': 'Ticketeira',
            'adm_tickeira_onda': 'Adm Tickeira Onda',
            'atracoes': 'Atrações',
            'pct_grupo_onda': '% Grupo Onda',
            'meta_grupo_onda': 'Meta Grupo Onda',
            'evento_realizado': 'Evento Realizado',
            'pct_patrocinio': '% Patrocínio',
            'publico_estimado': 'Público Estimado',
            'ingressos_emitidos': 'Ingressos Emitidos',
            'ingressos_validados': 'Ingressos Validados',
            'no_show': 'No Show',
            'cortesias_emitidas': 'Cortesias Emitidas',
            'ingressos_permuta': 'Ingressos Permuta',
            'prestadores_de_servico': 'Prestadores de serviço',
            'feedback_dos_clientes': 'Feedback dos Clientes',
            'destaques': 'Destaques',
            'quantidade_de_leads_captado': 'Quantidade de Leads Captado',
            'engajamento': 'Engajamento',
            'taxa_de_conversao': 'Taxa de Conversão',
            'roi_marketing': 'ROI Marketing',
            'custo_por_participante': 'Custo por Participante',
            'projecao_de_receitas_bilheteria': 'Projeção de Receitas - Bilheteria',
            'projecao_de_receitas_bar': 'Projeção de Receitas - Bar',
            'projecao_de_receitas_alimentacao': 'Projeção de Receitas - Alimentação',
            'projecao_de_receitas_patrocinios': 'Projeção de Receitas - Patrocínios',
            'projecao_de_receitas_loja': 'Projeção de Receitas - Loja',
            'projecao_de_receitas_outros': 'Projeção de Receitas - Outros',
            'receitas_atuais_bilheteria': 'Receitas atuais - Bilheteria',
            'receitas_atuais_bar': 'Receitas atuais - Bar',
            'receitas_atuais_alimentacao': 'Receitas atuais - Alimentação',
            'receitas_atuais_patrocinios': 'Receitas atuais - Patrocínios',
            'receitas_atuais_loja': 'Receitas atuais - Loja',
            'receitas_atuais_outros': 'Receitas atuais - Outros',
            'despesas_atuais_artistico_logistica': 'Despesas atuais - Artístico e Logística',
            'despesas_atuais_licenca_impostos': 'Despesas atuais - Licença e Impostos',
            'despesas_atuais_locacao': 'Despesas atuais - Locação',
            'despesas_atuais_projeto': 'Despesas atuais - Projeto',
            'despesas_atuais_infraestrutura': 'Despesas atuais - Infraestrutura',
            'despesas_atuais_cenografia_decoracao': 'Despesas atuais - Cenografia e Decoração',
            'despesas_atuais_tecnologia': 'Despesas atuais - Tecnologia',
            'despesas_atuais_marketing_midias_gerais': 'Despesas atuais - Marketing e Mídias Gerais',
            'despesas_atuais_operacional': 'Despesas atuais - Operacional',
            'despesas_atuais_aeb': 'Despesas atuais - AEB',
            'despesas_atuais_diversos': 'Despesas atuais - Diversos',
            'projecao_de_receitas_valor_total': 'Projeção de Receitas - Valor Total',
            'projecao_margem_de_lucro': 'Projeção - Margem de Lucro',
            'receitas_atuais_valor_total': 'Receitas atuais - Valor Total',
            'despesa_total': 'Despesa Total ',
            'lucro_receitas_atuais_despesas_atuais': 'Lucro (Receitas atuais - Despesas atuais)',
            'ticket_medio_bilheteria_e_aeb': 'Ticket Médio (Bilheteria e AEB)',
            'gap_diferenca_entre_previsao_e_real': 'GAP (Diferença entre previsão e real)',
            'roi_lucro_receita': 'ROI (Lucro / Receita)',
            'resultado_grupo_onda': 'Resultado Grupo Onda',
            'resultado_socio_local_label': 'Resultado Sócio Local Label',
            'resultado_socio_dono_label': 'Resultado Sócio Dono Label',
            'meta_atingida': 'Meta Atingida',
            'links_planilhas': 'Links Planilhas',
            'qual_zig': 'Qual ZIG',
            'detalhamento_aeb_no_drive': 'Detalhamento AEB no Drive',
            'roi': 'ROI',
            'projecao_de_despesas': 'Projeção de Despesas - Total',
        }

        # Campos que devem ser convertidos para números
        numeric_fields = {
            'publico_estimado', 'ingressos_emitidos', 'ingressos_validados', 'no_show',
            'cortesias_emitidas', 'ingressos_permuta', 'quantidade_de_leads_captado',
            'taxa_de_conversao', 'custo_por_participante',
            'projecao_de_receitas_bilheteria', 'projecao_de_receitas_bar',
            'projecao_de_receitas_alimentacao', 'projecao_de_receitas_patrocinios',
            'projecao_de_receitas_loja', 'projecao_de_receitas_outros',
            'receitas_atuais_bilheteria', 'receitas_atuais_bar',
            'receitas_atuais_alimentacao', 'receitas_atuais_patrocinios',
            'receitas_atuais_loja', 'receitas_atuais_outros',
            'projecao_de_despesas',
            'despesas_atuais_artistico_logistica', 'despesas_atuais_licenca_impostos',
            'despesas_atuais_locacao', 'despesas_atuais_projeto',
            'despesas_atuais_infraestrutura', 'despesas_atuais_cenografia_decoracao',
            'despesas_atuais_tecnologia', 'despesas_atuais_marketing_midias_gerais',
            'despesas_atuais_operacional', 'despesas_atuais_aeb', 'despesas_atuais_diversos',
            'projecao_de_receitas_valor_total', 'projecao_margem_de_lucro',
            'receitas_atuais_valor_total', 'despesa_total',
            'lucro_receitas_atuais_despesas_atuais', 'ticket_medio_bilheteria_e_aeb',
            'gap_diferenca_entre_previsao_e_real', 'roi_lucro_receita',
            'resultado_grupo_onda', 'resultado_socio_local_label', 'resultado_socio_dono_label',
        }

        def convert_to_number(value: str) -> float:
            """Converte string para número, tratando diferentes formatos"""
            if not value or value == '':
                return 0.0
            # Remove espaços
            value = value.strip()
            # Remove R$ e outros símbolos
            value = value.replace('R$', '').replace('$', '')
            # Remove separadores de milhar
            value = value.replace('.', '')  # 1.000 -> 1000
            # Converte vírgula para ponto decimal
            value = value.replace(',', '.')  # 1,50 -> 1.50
            # Remove espaços novamente
            value = value.strip()
            # Remove % se houver
            value = value.replace('%', '')

            try:
                return float(value)
            except (ValueError, AttributeError):
                return 0.0

        # Mapear os campos para os nomes esperados pelo frontend
        mapped_data = []
        for row in raw_data:
            mapped_row = {}
            for old_key, new_key in field_mapping.items():
                if old_key in row:
                    value = row[old_key]
                    # Converter campos numéricos
                    if old_key in numeric_fields and isinstance(value, str):
                        value = convert_to_number(value)
                    mapped_row[new_key] = value
            mapped_data.append(mapped_row)

        return mapped_data

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

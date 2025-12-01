-- ============================================================================
-- BigQuery Table Creation Scripts
-- Dataset: cortex-analytics-479819.grupo_onda
-- ============================================================================

-- ============================================================================
-- 1. Tabela: planejamento
-- Dados do planejamento geral de eventos
-- ============================================================================

CREATE TABLE IF NOT EXISTS `cortex-analytics-479819.grupo_onda.planejamento` (
  -- Identificadores
  evento_id STRING,
  evento_nome STRING,

  -- Datas
  data_evento DATE,
  mes_evento STRING,
  ano_evento INT64,

  -- Localização
  cidade STRING,
  estado STRING,
  local_evento STRING,

  -- Classificação
  tipo_evento STRING,
  categoria STRING,
  segmento STRING,

  -- Financeiro
  orcamento_total FLOAT64,
  receita_esperada FLOAT64,
  custo_total FLOAT64,
  lucro_esperado FLOAT64,

  -- Público
  publico_estimado INT64,
  publico_validado INT64,
  taxa_ocupacao FLOAT64,

  -- Vendas
  ingressos_vendidos INT64,
  ingressos_disponiveis INT64,
  valor_medio_ingresso FLOAT64,

  -- Responsáveis
  base_responsavel STRING,
  gerente_projeto STRING,
  equipe STRING,

  -- Status
  status STRING,
  fase STRING,

  -- Captação
  leads_captados INT64,
  taxa_conversao FLOAT64,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY data_evento
CLUSTER BY cidade, tipo_evento, status
OPTIONS(
  description="Planejamento geral de eventos do Grupo Onda",
  labels=[("ambiente", "producao"), ("fonte", "google_sheets")]
);

-- ============================================================================
-- 2. Tabela: bar_zig
-- Transações do bar/loja nos eventos
-- ============================================================================

CREATE TABLE IF NOT EXISTS `cortex-analytics-479819.grupo_onda.bar_zig` (
  -- Identificadores da Transação
  transactionId STRING NOT NULL,
  transactionDate TIMESTAMP,
  invoiceId STRING,

  -- Produto
  productId STRING,
  productSku STRING,
  productName STRING,
  productCategory STRING,

  -- Valores
  unitValue FLOAT64,
  count INT64,
  fractionalAmount FLOAT64,
  fractionUnit STRING,
  discountValue FLOAT64,
  total_value FLOAT64,  -- Calculado: unitValue * count - discountValue

  -- Rede/Loja
  redeId STRING,
  lojaId STRING,
  barId STRING,
  barName STRING,

  -- Evento
  eventId STRING,
  eventName STRING,
  eventDate TIMESTAMP,

  -- Operação
  employeeName STRING,
  type STRING,  -- Normal, Cortesia, etc
  source STRING,  -- ficha, cartao, pix, etc
  additions STRING,  -- JSON com adicionais
  isRefunded BOOL,

  -- Metadata do Evento
  _evento_nome STRING,
  _evento_data DATE,
  _evento_loja_id STRING,
  _evento_tipo STRING,
  _store_id STRING,

  -- Observações
  obs STRING,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(transactionDate)
CLUSTER BY eventId, productCategory, barId
OPTIONS(
  description="Transações do bar/loja Zig nos eventos",
  labels=[("ambiente", "producao"), ("fonte", "sistema_zig")]
);

-- ============================================================================
-- 3. Tabela: vendas_ingresso
-- Vendas de ingressos pelos canais de venda
-- ============================================================================

CREATE TABLE IF NOT EXISTS `cortex-analytics-479819.grupo_onda.vendas_ingresso` (
  -- Identificadores
  id STRING NOT NULL,
  venda_id STRING,
  pedido_id STRING,

  -- Evento
  evento STRING,
  nome_evento STRING,
  data_evento DATE,
  hora_evento STRING,
  cidade_evento STRING,
  local_evento STRING,

  -- Cliente
  cpf STRING,
  nome_cliente STRING,
  email STRING,
  telefone STRING,

  -- Ingresso
  tipo_ingresso STRING,
  lote STRING,
  setor STRING,
  quantidade INT64,

  -- Valores
  valor_unitario FLOAT64,
  valor_bruto FLOAT64,
  valor_desconto FLOAT64,
  valor_taxa FLOAT64,
  valor_liquido FLOAT64,

  -- Canal de Venda
  ticketeira STRING,
  plataforma STRING,
  canal_venda STRING,

  -- Responsável
  base_responsavel STRING,
  vendedor STRING,

  -- Status
  status STRING,
  status_pagamento STRING,
  forma_pagamento STRING,

  -- Datas
  data_venda TIMESTAMP,
  data_pagamento TIMESTAMP,
  data_validacao TIMESTAMP,

  -- Controle
  validado BOOL,
  codigo_validacao STRING,
  numero_ingresso STRING,

  -- Observações
  obs STRING,
  tags STRING,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY data_evento
CLUSTER BY evento, ticketeira, status
OPTIONS(
  description="Vendas de ingressos por todos os canais",
  labels=[("ambiente", "producao"), ("fonte", "ticketeiras")]
);

-- ============================================================================
-- Índices e Otimizações
-- ============================================================================

-- Criar views materializadas para queries frequentes (opcional)

-- View: Resumo diário de vendas por evento
CREATE MATERIALIZED VIEW IF NOT EXISTS
`cortex-analytics-479819.grupo_onda.mv_vendas_diarias`
PARTITION BY data_evento
AS
SELECT
  data_evento,
  evento,
  ticketeira,
  COUNT(*) as total_vendas,
  SUM(quantidade) as total_ingressos,
  SUM(valor_bruto) as receita_bruta,
  SUM(valor_liquido) as receita_liquida,
  AVG(valor_liquido / quantidade) as ticket_medio
FROM `cortex-analytics-479819.grupo_onda.vendas_ingresso`
WHERE status = 'Confirmado'
GROUP BY data_evento, evento, ticketeira;

-- View: Resumo de bar por evento
CREATE MATERIALIZED VIEW IF NOT EXISTS
`cortex-analytics-479819.grupo_onda.mv_bar_por_evento`
PARTITION BY DATE(transactionDate)
AS
SELECT
  DATE(transactionDate) as data,
  transactionDate,
  eventId,
  eventName,
  productCategory,
  COUNT(*) as total_transacoes,
  SUM(count) as quantidade_vendida,
  SUM(unitValue * count - discountValue) as receita_total
FROM `cortex-analytics-479819.grupo_onda.bar_zig`
WHERE isRefunded = FALSE
GROUP BY data, transactionDate, eventId, eventName, productCategory;

-- ============================================================================
-- Grants de Permissão (ajuste conforme sua service account)
-- ============================================================================

-- GRANT `roles/bigquery.dataViewer` ON TABLE
-- `cortex-analytics-479819.grupo_onda.planejamento`
-- TO "serviceAccount:YOUR-SERVICE-ACCOUNT@cortex-analytics-479819.iam.gserviceaccount.com";

-- GRANT `roles/bigquery.dataViewer` ON TABLE
-- `cortex-analytics-479819.grupo_onda.bar_zig`
-- TO "serviceAccount:YOUR-SERVICE-ACCOUNT@cortex-analytics-479819.iam.gserviceaccount.com";

-- GRANT `roles/bigquery.dataViewer` ON TABLE
-- `cortex-analytics-479819.grupo_onda.vendas_ingresso`
-- TO "serviceAccount:YOUR-SERVICE-ACCOUNT@cortex-analytics-479819.iam.gserviceaccount.com";

-- ============================================================================
-- Queries de Teste
-- ============================================================================

-- Testar planejamento
-- SELECT COUNT(*) as total_eventos FROM `cortex-analytics-479819.grupo_onda.planejamento`;

-- Testar bar
-- SELECT COUNT(*) as total_transacoes FROM `cortex-analytics-479819.grupo_onda.bar_zig`;

-- Testar vendas
-- SELECT COUNT(*) as total_vendas FROM `cortex-analytics-479819.grupo_onda.vendas_ingresso`;

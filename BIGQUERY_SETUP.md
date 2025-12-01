# Setup BigQuery + Cloud Run - Dashboard Grupo Onda

Guia completo para migrar de Google Sheets para BigQuery + Cloud Run

## 📊 Arquitetura

```
Frontend (Vercel) → Backend (Cloud Run) → BigQuery (3 tabelas)
                         ↓
                  Service Account + IAM
```

---

## Passo 1: Criar Tabelas no BigQuery

### 1.1 Acessar BigQuery Console

1. Acesse [BigQuery Console](https://console.cloud.google.com/bigquery)
2. Selecione projeto: `cortex-analytics-479819`
3. Confirme que o dataset `grupo_onda` existe

### 1.2 Executar SQL de Criação

No editor de queries do BigQuery, execute o arquivo [bigquery_setup.sql](bigquery_setup.sql):

```sql
-- Copie e cole TODO o conteúdo do arquivo bigquery_setup.sql
-- Ele criará as 3 tabelas:
-- 1. planejamento
-- 2. bar_zig
-- 3. vendas_ingresso
```

✅ **Resultado esperado**: 3 tabelas criadas + 2 materialized views

---

## Passo 2: Importar Dados Existentes

### Opção A: Upload via Console (Recomendado para primeira vez)

1. **Para bar_zig:**
   ```
   - Vá em `gerenciamento_grupo_onda`
   - Clique em `bar_zig` → "Load Data"
   - Source: "Upload" → Selecione `backend/data/bar_zig.csv`
   - File format: CSV
   - Auto-detect schema: OFF (use schema definido)
   - Write preference: Append to table
   ```

2. **Para vendas_ingresso:**
   ```
   - Mesmo processo, usando `backend/data/vendas_ingresso.csv`
   ```

3. **Para planejamento:**
   ```
   - Exporte a planilha Google Sheets como CSV
   - Upload no BigQuery
   ```

### Opção B: Importar direto do Google Sheets

```sql
-- Bar (da planilha Google Sheets)
LOAD DATA OVERWRITE `cortex-analytics-479819.grupo_onda.bar_zig`
FROM FILES (
  format = 'CSV',
  uris = ['https://docs.google.com/spreadsheets/d/1C68_TiIwrYjuFszxdJmiIUwq7Kk42MIMv2-ysOSFpR4/export?format=csv&gid=0']
);

-- Vendas (da planilha Google Sheets)
LOAD DATA OVERWRITE `cortex-analytics-479819.grupo_onda.vendas_ingresso`
FROM FILES (
  format = 'CSV',
  uris = ['https://docs.google.com/spreadsheets/d/1hHFo0sJnh4nAQbo0U2R1Kx95KTbyuImMu_C67YgELm0/export?format=csv&gid=0']
);

-- Planejamento
LOAD DATA OVERWRITE `cortex-analytics-479819.grupo_onda.planejamento`
FROM FILES (
  format = 'CSV',
  uris = ['https://docs.google.com/spreadsheets/d/1t1KVI9E6GanMnrNR55U0ssM46GBiWN_d5Ux9qVACDi8/export?format=csv']
);
```

---

## Passo 3: Criar Service Account

### 3.1 Criar Service Account

```bash
gcloud iam service-accounts create dashboard-backend \
  --display-name="Dashboard Backend Service Account" \
  --project=cortex-analytics-479819
```

### 3.2 Dar Permissões

```bash
# BigQuery Data Viewer
gcloud projects add-iam-policy-binding cortex-analytics-479819 \
  --member="serviceAccount:dashboard-backend@cortex-analytics-479819.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

# BigQuery Job User (para rodar queries)
gcloud projects add-iam-policy-binding cortex-analytics-479819 \
  --member="serviceAccount:dashboard-backend@cortex-analytics-479819.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

### 3.3 Criar Chave JSON

```bash
gcloud iam service-accounts keys create dashboard-sa-key.json \
  --iam-account=dashboard-backend@cortex-analytics-479819.iam.gserviceaccount.com
```

⚠️ **IMPORTANTE**: Guarde o arquivo `dashboard-sa-key.json` em local seguro!

---

## Passo 4: Configurar Backend

### 4.1 Instalar Dependências

```bash
cd backend
pip install google-cloud-bigquery
```

Já está configurado em `requirements.txt`:
```
google-cloud-bigquery==3.14.1
```

### 4.2 Variáveis de Ambiente

Criar `.env` (local) ou configurar no Cloud Run:

```env
# BigQuery
GCP_PROJECT_ID=cortex-analytics-479819
BIGQUERY_DATASET=grupo_onda
GOOGLE_APPLICATION_CREDENTIALS=./dashboard-sa-key.json  # Local
# No Cloud Run, use service account attachment

# Server
PORT=8080  # Cloud Run usa 8080
DEBUG=false
```

---

## Passo 5: Deploy no Cloud Run

### 5.1 Criar Dockerfile

Já incluído no projeto em `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
```

### 5.2 Build e Deploy

```bash
# Autenticar
gcloud auth login
gcloud config set project cortex-analytics-479819

# Build
cd backend
gcloud builds submit --tag gcr.io/cortex-analytics-479819/dashboard-backend

# Deploy no Cloud Run
gcloud run deploy dashboard-backend \
  --image gcr.io/cortex-analytics-479819/dashboard-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account dashboard-backend@cortex-analytics-479819.iam.gserviceaccount.com \
  --set-env-vars "GCP_PROJECT_ID=cortex-analytics-479819,BIGQUERY_DATASET=grupo_onda" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### 5.3 Pegar URL do Cloud Run

Após deploy, você receberá uma URL tipo:
```
https://dashboard-backend-XXXXX-uc.a.run.app
```

---

## Passo 6: Atualizar Frontend no Vercel

1. No Vercel → Settings → Environment Variables
2. Atualizar:
   ```
   VITE_API_URL = https://dashboard-backend-XXXXX-uc.a.run.app
   ```
3. Redeploy

---

## 📊 Custos Estimados (Free Tier)

### BigQuery
- **Queries**: 1 TB/mês grátis
- **Storage**: 10 GB/mês grátis
- Estimativa: **$0/mês** (dentro do free tier)

### Cloud Run
- **Invocações**: 2M/mês grátis
- **CPU**: 180k vCPU-seconds/mês
- **Memória**: 360k GiB-seconds/mês
- Estimativa: **$0-5/mês**

### Total: ~$0-5/mês 🎉

---

## 🔄 Atualização de Dados

### Opção 1: Scheduled Queries (Recomendado)

Configure queries agendadas no BigQuery para importar do Google Sheets automaticamente:

```sql
-- Agendar para rodar diariamente
CREATE OR REPLACE SCHEDULED QUERY sync_bar_from_sheets
OPTIONS (
  schedule = 'every day 03:00',
  time_zone = 'America/Sao_Paulo'
)
AS
LOAD DATA OVERWRITE `cortex-analytics-479819.grupo_onda.bar_zig`
FROM FILES (
  format = 'CSV',
  uris = ['URL_DO_GOOGLE_SHEETS']
);
```

### Opção 2: Cloud Functions

Criar function que roda periodicamente (Cloud Scheduler):
- Lê Google Sheets
- Insere no BigQuery
- Dispara notificação

### Opção 3: Manual

```bash
bq load --replace \
  --source_format=CSV \
  --autodetect \
  gerenciamento_grupo_onda.bar_zig \
  gs://seu-bucket/bar_zig.csv
```

---

## 🧪 Testar

### 1. Testar BigQuery

```sql
SELECT COUNT(*) FROM `cortex-analytics-479819.grupo_onda.bar_zig`;
SELECT COUNT(*) FROM `cortex-analytics-479819.grupo_onda.vendas_ingresso`;
SELECT COUNT(*) FROM `cortex-analytics-479819.grupo_onda.planejamento`;
```

### 2. Testar Backend

```bash
curl https://dashboard-backend-XXXXX-uc.a.run.app/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "bigquery": true
}
```

### 3. Testar Frontend

Abrir no navegador e ver dados carregando!

---

## 🚀 Vantagens dessa Arquitetura

✅ **Performance**: Queries SQL nativas (100x mais rápido que CSV)
✅ **Escalabilidade**: BigQuery escala para petabytes
✅ **Custo**: Grátis até 1TB de queries/mês
✅ **Infraestrutura Única**: Tudo no GCP
✅ **Profissional**: Stack enterprise-grade
✅ **Cache Automático**: BigQuery cacheia queries
✅ **Segurança**: IAM roles granulares
✅ **Monitoramento**: Cloud Logging + Monitoring inclusos

---

## 📝 Próximos Passos

1. ✅ Executar `bigquery_setup.sql` no BigQuery Console
2. ✅ Importar CSVs para as tabelas
3. ✅ Criar service account com permissões
4. ✅ Deploy backend no Cloud Run
5. ✅ Atualizar VITE_API_URL no Vercel
6. ✅ Testar tudo funcionando
7. 🔄 Configurar sync automático (opcional)

---

**Dúvidas?** Consulte:
- [BigQuery Docs](https://cloud.google.com/bigquery/docs)
- [Cloud Run Docs](https://cloud.google.com/run/docs)

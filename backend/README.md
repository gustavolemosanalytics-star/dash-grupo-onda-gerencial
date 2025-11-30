# Backend - FastAPI

Backend do dashboard em **Python FastAPI**.

## Stack

- **FastAPI** - Framework web moderno e rápido
- **Python 3.x** - Linguagem de programação
- **PostgreSQL** - Banco de dados (via psycopg2)
- **Pandas** - Processamento de dados
- **Uvicorn** - Servidor ASGI
- **Pydantic** - Validação de dados

## Estrutura

```
backend/
├── routers/
│   ├── __init__.py
│   ├── bar.py              # 5 endpoints para dados do bar
│   ├── vendas_ingresso.py  # 5 endpoints para vendas
│   └── sheets.py           # 1 endpoint para Google Sheets
├── config.py               # Configurações (Pydantic Settings)
├── database.py             # Conexão PostgreSQL
├── main.py                 # Aplicação FastAPI
├── requirements.txt        # Dependências Python
└── run.sh                 # Script de inicialização
```

## Desenvolvimento

### 1. Criar ambiente virtual

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

### 2. Instalar dependências

```bash
pip install -r requirements.txt
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
POSTGRES_URL=postgres://user:password@host:5432/database
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv
PORT=4000
```

### 4. Executar servidor

```bash
python main.py
```

Ou use o script:

```bash
bash run.sh
```

## Endpoints Disponíveis

### Health Check
- `GET /api/health` - Status da API

### Dashboard (Legado)
- `GET /api/dashboard` - Todos os dados (compatibilidade)

### Bar
- `GET /api/bar` - Todas as transações
- `GET /api/bar/stats` - Estatísticas agregadas
- `GET /api/bar/by-product` - Agrupado por produto
- `GET /api/bar/by-event` - Agrupado por evento
- `GET /api/bar/by-category` - Agrupado por categoria

### Vendas de Ingresso
- `GET /api/vendas-ingresso` - Todas as vendas
- `GET /api/vendas-ingresso/stats` - Estatísticas agregadas
- `GET /api/vendas-ingresso/by-event` - Agrupado por evento
- `GET /api/vendas-ingresso/by-channel` - Agrupado por canal
- `GET /api/vendas-ingresso/by-type` - Agrupado por tipo

### Google Sheets
- `GET /api/sheets` - Dados da planilha

## Documentação Interativa

Após iniciar o servidor, acesse:

- **Swagger UI**: http://localhost:4000/docs
- **ReDoc**: http://localhost:4000/redoc

## Estrutura de um Router

```python
# routers/bar.py
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from database import execute_query

router = APIRouter(prefix="/bar", tags=["Bar"])

@router.get("/")
async def get_bar_data():
    """Retorna todos os dados da tabela bar_zig"""
    query = "SELECT * FROM bar_zig ORDER BY transactionDate DESC"
    return execute_query(query)

@router.get("/stats")
async def get_bar_stats():
    """Retorna estatísticas agregadas"""
    query = """
        SELECT
            COUNT(*) as total_transactions,
            SUM(CAST(total AS NUMERIC)) as total_revenue
        FROM bar_zig
    """
    stats = execute_query(query)
    return stats[0] if stats else {}
```

## Banco de Dados

### Conexão

A conexão com PostgreSQL é gerenciada em `database.py`:

```python
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor

@contextmanager
def get_db_connection():
    conn = psycopg2.connect(
        settings.postgres_url,
        cursor_factory=RealDictCursor
    )
    try:
        yield conn
    finally:
        conn.close()
```

### Queries

```python
def execute_query(query: str, params=None):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()
```

## Deploy

### Heroku

```bash
# Procfile
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Railway

```bash
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
```

### Render

```bash
# render.yaml
services:
  - type: web
    name: dashboard-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Testes

Para adicionar testes:

```bash
pip install pytest pytest-asyncio httpx
```

Criar `test_main.py`:

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

Executar:

```bash
pytest
```

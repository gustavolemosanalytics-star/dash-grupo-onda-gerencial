# Backend - FastAPI

Backend do dashboard em **Python FastAPI**.

## Stack

- **FastAPI** - Framework web moderno e rápido
- **Python 3.x** - Linguagem de programação
- **Pandas** - Processamento e análise de dados CSV
- **Uvicorn** - Servidor ASGI
- **Pydantic** - Validação de dados

## Estrutura

```
backend/
├── routers/
│   ├── __init__.py
│   ├── bar.py              # 5 endpoints para dados do bar
│   ├── vendas_ingresso.py  # 5 endpoints para vendas
│   ├── csv_export.py       # CSV streaming endpoints
│   └── sheets.py           # 1 endpoint para Google Sheets
├── data/                   # Arquivos CSV
│   ├── bar_zig_rows.csv
│   └── vendas_ingresso_rows.csv
├── config.py               # Configurações (Pydantic Settings)
├── csv_loader.py           # Carregamento e cache de CSV
├── cache.py                # Sistema de cache em memória
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
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv
PORT=4000
CSV_BAR_PATH=./backend/data/bar_zig_rows.csv
CSV_VENDAS_PATH=./backend/data/vendas_ingresso_rows.csv
```

### 4. Adicionar arquivos CSV

Coloque os arquivos CSV na pasta `backend/data/`:
- `bar_zig_rows.csv` ou `bar_zig.csv`
- `vendas_ingresso_rows.csv` ou `vendas_ingresso.csv`

### 5. Executar servidor

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
from csv_loader import csv_loader

router = APIRouter(prefix="/bar", tags=["Bar"])

CSV_FILENAME = "bar_zig_rows.csv"

@router.get("/")
async def get_bar_data():
    """Retorna todos os dados do CSV bar_zig"""
    data = csv_loader.load_csv(CSV_FILENAME)
    return data

@router.get("/stats")
async def get_bar_stats():
    """Retorna estatísticas agregadas"""
    data = csv_loader.load_csv(CSV_FILENAME)

    total_transactions = len(data)
    total_revenue = sum(float(row.get('total', 0) or 0) for row in data)

    return {
        'total_transactions': total_transactions,
        'total_revenue': total_revenue
    }
```

## Carregamento de CSV

### CSV Loader

O carregamento de CSV é gerenciado em `csv_loader.py`:

```python
import pandas as pd
from pathlib import Path

class CSVLoader:
    """Carrega e cacheia dados de arquivos CSV"""

    def __init__(self):
        self._cache = {}

    def load_csv(self, filename: str, force_reload: bool = False):
        """Carrega CSV e retorna como lista de dicts"""
        filepath = CSV_DIR / filename

        if not force_reload and filename in self._cache:
            return self._cache[filename]['data']

        df = pd.read_csv(filepath)
        data = df.to_dict('records')

        self._cache[filename] = {'data': data}
        return data
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

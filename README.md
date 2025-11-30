# Dashboard Grupo Onda Gerencial

Dashboard de vendas e analytics com backend **Python FastAPI** e frontend **React + Tailwind**.

## Stack Tecnológica

### Backend
- **Python 3.x** com **FastAPI** - API REST moderna e assíncrona
- **PostgreSQL** (Supabase) - Banco de dados relacional
- **Pandas** - Processamento e análise de dados
- **Uvicorn** - Servidor ASGI de alta performance

### Frontend
- **React 19** + **TypeScript** - UI type-safe
- **Tailwind CSS** - Estilização utilitária
- **React Query** - Cache e sincronização de dados
- **Recharts** - Visualização de dados
- **Vite** - Build tool rápido

### Fontes de Dados
- **Banco PostgreSQL** com tabelas `bar_zig` e `vendas_ingresso`
- **Planilha Google Sheets**: [Base de Dados | Plano Geral Eventos](https://docs.google.com/spreadsheets/d/1t1KVI9E6GanMnrNR55U0ssM46GBiWN_d5Ux9qVACDi8/edit?usp=chrome_ntp)

## Estrutura do Projeto

```
dash-grupo-onda-gerencial/
├── backend/                    # Backend FastAPI (Python)
│   ├── routers/               # Rotas organizadas por módulo
│   │   ├── bar.py            # Endpoints para dados do bar
│   │   ├── vendas_ingresso.py # Endpoints para vendas de ingresso
│   │   └── sheets.py         # Endpoints para Google Sheets
│   ├── config.py             # Configurações e variáveis de ambiente
│   ├── database.py           # Conexão e queries do banco
│   ├── main.py               # Aplicação FastAPI principal
│   ├── requirements.txt      # Dependências Python
│   └── run.sh               # Script de inicialização
│
├── frontend/                   # Frontend React + TypeScript
│   ├── src/                  # Código fonte
│   │   ├── pages/           # Páginas do dashboard (estrutura modular)
│   │   │   ├── Bar/        # Página do Bar
│   │   │   │   ├── hooks/  # useBarData, useBarStats, etc.
│   │   │   │   └── components/ # Componentes específicos
│   │   │   ├── VendasIngresso/ # Página de Vendas de Ingresso
│   │   │   │   ├── hooks/
│   │   │   │   └── components/
│   │   │   └── VisaoGeral/ # Página de visão geral
│   │   ├── services/        # Serviços de API
│   │   │   └── api.ts      # Cliente API centralizado
│   │   ├── types/          # TypeScript types
│   │   │   ├── bar.ts
│   │   │   └── vendas.ts
│   │   ├── components/     # Componentes compartilhados
│   │   ├── features/       # Features reutilizáveis
│   │   └── lib/           # Utilitários e formatadores
│   ├── public/             # Arquivos estáticos
│   ├── package.json        # Dependências Node.js
│   └── vite.config.ts     # Configuração Vite
│
├── .env                       # Variáveis de ambiente
├── .gitignore                # Arquivos ignorados pelo Git
├── package.json              # Scripts de coordenação
└── README.md                # Documentação
```

## Requisitos

- **Node.js 20+** (para o frontend)
- **Python 3.x** (para o backend)
- Conta Supabase ou acesso ao banco PostgreSQL
- Acesso de leitura à planilha compartilhada

## Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
POSTGRES_URL=postgres://user:password@host:5432/database
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv
PORT=4000
```

### 2. Instalação Completa

Instale todas as dependências (backend + frontend) de uma vez:

```bash
npm install
npm run install:all
```

Ou instale separadamente:

**Backend (Python):**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

**Frontend (Node.js):**
```bash
cd frontend
npm install
cd ..
```

## Scripts de Execução

### Modo Desenvolvimento (Completo)
```bash
npm run dev
```
Inicia backend FastAPI + frontend React em paralelo
- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

### Apenas Backend
```bash
npm run dev:backend
```
ou
```bash
cd backend && bash run.sh
```

### Apenas Frontend
```bash
npm run dev:frontend
```
ou
```bash
cd frontend && npm run dev
```

### Build de Produção
```bash
npm run build:frontend
```
Gera build otimizado em `frontend/dist/`

### Lint
```bash
npm run lint
```

## Endpoints da API

### Health Check
- `GET /api/health` - Status da API

### Dashboard (Legado)
- `GET /api/dashboard` - Retorna todos os dados (compatibilidade)

### Bar (Consumo)
- `GET /api/bar` - Lista todas as transações
- `GET /api/bar/stats` - Estatísticas agregadas
- `GET /api/bar/by-product` - Agrupado por produto
- `GET /api/bar/by-event` - Agrupado por evento
- `GET /api/bar/by-category` - Agrupado por categoria

### Vendas de Ingresso
- `GET /api/vendas-ingresso` - Lista todas as vendas
- `GET /api/vendas-ingresso/stats` - Estatísticas agregadas
- `GET /api/vendas-ingresso/by-event` - Agrupado por evento
- `GET /api/vendas-ingresso/by-channel` - Agrupado por canal
- `GET /api/vendas-ingresso/by-type` - Agrupado por tipo

### Google Sheets
- `GET /api/sheets` - Dados da planilha Google

## Padrões de Código

### Backend (Python)
- Routers separados por domínio (bar, vendas, sheets)
- Type hints em todas as funções
- Logs estruturados
- Exception handling adequado
- Queries SQL otimizadas

### Frontend (React)
- Hooks customizados por página (`useBarData`, `useVendasData`)
- Types TypeScript centralizados em `src/types/`
- Componentes funcionais com composição
- React Query para cache e sincronização
- Serviço de API centralizado em `src/services/api.ts`

## Build e Deploy

```bash
npm run build
```

A pasta `dist` contém o build estático para deploy no Netlify/Vercel.

Para o backend Python, use Heroku, Railway, Render ou similar.

## Por que Python FastAPI?

Este projeto usa **Python FastAPI** no backend, oferecendo:

- ✅ **Alta Performance** - FastAPI é um dos frameworks Python mais rápidos, comparável ao Node.js
- ✅ **Processamento de Dados** - Pandas para análise e transformação de dados eficiente
- ✅ **Type Safety** - Python type hints + Pydantic para validação automática
- ✅ **Documentação Automática** - Swagger/OpenAPI gerado automaticamente em `/docs`
- ✅ **Rotas Modulares** - Código organizado por domínio (bar, vendas, sheets)
- ✅ **Async/Await Nativo** - Operações I/O assíncronas sem bloqueio
- ✅ **Menor Consumo de Memória** - Footprint reduzido comparado a Node.js

---

Feito para acelerar a análise em tempo real do **Grupo Onda Gerencial**.

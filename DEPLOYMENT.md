# Guia de Deploy - Dashboard Grupo Onda

Este guia explica como fazer deploy do dashboard em produção usando **Vercel** (frontend) + **Render.com** (backend).

## Arquitetura de Deploy

```
┌─────────────────┐         ┌──────────────────┐
│  Vercel         │  HTTPS  │  Render.com      │
│  (Frontend)     │ ───────>│  (Backend)       │
│  React + Vite   │         │  FastAPI + CSV   │
└─────────────────┘         └──────────────────┘
```

**Por que duas plataformas?**
- Vercel hospeda apenas **frontend estático** (HTML/CSS/JS)
- Render.com hospeda **backend Python** (FastAPI)
- Em produção, o frontend chama a API do backend via HTTPS

---

## Passo 1: Deploy do Backend no Render.com

### 1.1 Criar conta no Render

1. Acesse [render.com](https://render.com)
2. Faça sign-up com GitHub
3. Autorize o Render a acessar seu repositório

### 1.2 Criar Web Service

1. No dashboard do Render, clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub: `dash-grupo-onda-gerencial`
3. Configure o serviço:

   ```
   Name: dash-onda-backend
   Region: Oregon (ou mais próximo)
   Branch: main
   Root Directory: (deixe vazio)
   Runtime: Python 3
   Build Command: cd backend && pip install -r requirements.txt
   Start Command: cd backend && python main.py
   Instance Type: Free
   ```

4. **Variáveis de Ambiente** (Environment Variables):

   Adicione estas variáveis:
   ```
   PORT = 4000
   GOOGLE_SHEET_URL = https://docs.google.com/spreadsheets/d/1t1KVI9E6GanMnrNR55U0ssM46GBiWN_d5Ux9qVACDi8/export?format=csv
   CSV_BAR_PATH = ./backend/data/bar_zig_rows.csv
   CSV_VENDAS_PATH = ./backend/data/vendas_ingresso_rows.csv
   ```

5. Clique em **"Create Web Service"**

### 1.3 Aguardar Deploy

- Render irá instalar dependências e iniciar o servidor
- Isso leva ~2-3 minutos
- Quando terminar, você verá um status "Live" e uma URL tipo:
  ```
  https://dash-onda-backend.onrender.com
  ```

### 1.4 Testar Backend

Abra no navegador:
```
https://dash-onda-backend.onrender.com/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "csv_bar": true,
  "csv_vendas": true
}
```

✅ Backend funcionando!

---

## Passo 2: Deploy do Frontend no Vercel

### 2.1 Configurar Variável de Ambiente

No Vercel, você precisa configurar a URL do backend:

1. Acesse seu projeto no Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione:

   ```
   Name: VITE_API_URL
   Value: https://dash-onda-backend.onrender.com
   ```

   ⚠️ **IMPORTANTE**: Use a URL exata do seu backend do Render (sem / no final)

### 2.2 Fazer Redeploy

1. Vá na aba **Deployments**
2. Clique nos **três pontos** no último deployment
3. Selecione **"Redeploy"**
4. Aguarde ~1-2 minutos

### 2.3 Testar Frontend

1. Abra a URL do Vercel (ex: `https://seu-app.vercel.app`)
2. Verifique se os dados aparecem
3. Abra o DevTools (F12) → Console
4. Não deve haver erros de CORS ou 404

✅ Frontend funcionando!

---

## Passo 3: Atualizações Futuras

### Atualizar Backend

1. Faça commit das alterações no código
2. Push para o GitHub: `git push`
3. Render faz auto-deploy automaticamente
4. Aguarde ~2 minutos

### Atualizar Frontend

1. Faça commit das alterações no código
2. Push para o GitHub: `git push`
3. Vercel faz auto-deploy automaticamente
4. Aguarde ~1 minuto

---

## Problemas Comuns

### ❌ Frontend não carrega dados

**Sintoma**: Tela em branco ou "Loading..." infinito

**Soluções**:
1. Verifique se `VITE_API_URL` está configurado no Vercel
2. Verifique se o backend está "Live" no Render
3. Teste a URL do backend manualmente: `/api/health`
4. Veja erros no DevTools Console (F12)

### ❌ Erro de CORS

**Sintoma**: `Access to fetch blocked by CORS policy`

**Solução**: O backend já tem CORS configurado para `allow_origins=["*"]`, mas se persistir:
1. Abra `backend/main.py`
2. Verifique se o CORS middleware está presente:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

### ❌ Backend muito lento

**Sintoma**: Primeira requisição após inatividade demora muito

**Causa**: Free tier do Render hiberna após 15 minutos de inatividade

**Soluções**:
1. Aceitar que a primeira carga será lenta (~30s)
2. Upgrade para plano pago ($7/mês) sem hibernação
3. Usar serviço de "ping" para manter o backend ativo

### ❌ CSVs não encontrados

**Sintoma**: `csv_bar: false` ou `csv_vendas: false` no `/api/health`

**Solução**:
1. Verifique se os CSVs estão commitados no repositório:
   ```bash
   git add backend/data/*.csv
   git commit -m "Add CSV data files"
   git push
   ```
2. Verifique os logs do Render para ver erros

---

## Custos

### Plano Atual (FREE)

- **Vercel**: Grátis (100GB bandwidth/mês)
- **Render**: Grátis com limitações:
  - Hiberna após 15 min de inatividade
  - 750 horas/mês de uptime
  - Performance básica

### Upgrade Recomendado (se necessário)

- **Render Starter**: $7/mês
  - Sem hibernação
  - Melhor performance
  - Uptime 24/7

---

## URLs de Produção

Depois do deploy, salve suas URLs:

```
Frontend: https://seu-app.vercel.app
Backend:  https://dash-onda-backend.onrender.com
API Docs: https://dash-onda-backend.onrender.com/docs
Health:   https://dash-onda-backend.onrender.com/api/health
```

---

## Alternativas ao Render

Se quiser experimentar outras plataformas:

1. **Railway.app**
   - Deploy similar ao Render
   - Free tier com $5 de crédito

2. **Fly.io**
   - Mais complexo (usa Docker)
   - Free tier limitado

3. **PythonAnywhere**
   - Focado em Python
   - Free tier muito limitado

---

## Monitoramento

### Logs do Backend

1. Acesse o Render Dashboard
2. Clique no seu serviço
3. Vá na aba **"Logs"**
4. Veja logs em tempo real

### Analytics do Frontend

1. Acesse o Vercel Dashboard
2. Vá na aba **"Analytics"**
3. Veja pageviews, erros, performance

---

## Próximos Passos

✅ Backend rodando no Render
✅ Frontend rodando no Vercel
✅ Dados carregando via CSV/Sheets

**Melhorias futuras**:
- Adicionar cache Redis para Google Sheets
- Implementar autenticação (se necessário)
- Adicionar testes automatizados
- Configurar domínio customizado

---

**Precisa de ajuda?** Abra uma issue no GitHub ou consulte os docs:
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)

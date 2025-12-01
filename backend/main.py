from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import bar_router, vendas_router, csv_export_router, sheets_router, bar_aggregated_router, vendas_aggregated_router, planejamento_router, dashboard_router
from bigquery_client import bq_client
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Dashboard API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(dashboard_router, prefix="/api")  # Dashboard principal (BigQuery)
app.include_router(bar_aggregated_router, prefix="/api")  # Bar endpoints agregados (RÁPIDO)
app.include_router(vendas_aggregated_router, prefix="/api")  # Vendas endpoints agregados (RÁPIDO)
app.include_router(bar_router, prefix="/api")
app.include_router(vendas_router, prefix="/api")
app.include_router(planejamento_router, prefix="/api")  # Planejamento endpoints
app.include_router(csv_export_router, prefix="/api")  # CSV streaming endpoints
app.include_router(sheets_router, prefix="/api")  # Google Sheets endpoint

# Health check
@app.get("/api/health")
async def health():
    """Health check básico"""
    bigquery_status = bq_client.client is not None
    return {
        "status": "ok",
        "bigquery": bigquery_status,
        "project": bq_client.project_id,
        "dataset": bq_client.dataset_id
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Iniciando aplicação (BigQuery Mode)...")
    logger.info(f"📊 Projeto: {bq_client.project_id}")
    logger.info(f"📊 Dataset: {bq_client.dataset_id}")

    if bq_client.client:
        logger.info("✅ BigQuery client inicializado com sucesso")
    else:
        logger.error("❌ Falha ao inicializar BigQuery client")

if __name__ == "__main__":
    import uvicorn
    from config import settings
    uvicorn.run(app, host="0.0.0.0", port=settings.port)

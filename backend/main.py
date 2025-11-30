from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import bar_router, vendas_router, csv_export_router, sheets_router, bar_aggregated_router, vendas_aggregated_router
from csv_loader import csv_loader
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
app.include_router(bar_aggregated_router, prefix="/api")  # Bar endpoints agregados (RÁPIDO)
app.include_router(vendas_aggregated_router, prefix="/api")  # Vendas endpoints agregados (RÁPIDO)
app.include_router(bar_router, prefix="/api")
app.include_router(vendas_router, prefix="/api")
app.include_router(csv_export_router, prefix="/api")  # CSV streaming endpoints
app.include_router(sheets_router, prefix="/api")  # Google Sheets endpoint

# Health check
@app.get("/api/health")
async def health():
    """Health check básico"""
    bar_csv_status = len(csv_loader.load_csv("bar_zig_rows.csv")) > 0
    vendas_csv_status = len(csv_loader.load_csv("vendas_ingresso_rows.csv")) > 0
    return {
        "status": "ok",
        "csv_bar": bar_csv_status,
        "csv_vendas": vendas_csv_status
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Iniciando aplicação (CSV Mode)...")

    # Carregar CSV do bar
    bar_data = csv_loader.load_csv("bar_zig_rows.csv")
    if bar_data:
        logger.info(f"✅ CSV carregado: bar_zig_rows.csv ({len(bar_data)} linhas)")
    else:
        logger.warning("⚠️  CSV bar_zig_rows.csv não encontrado ou vazio")

    # Carregar CSV de vendas
    vendas_data = csv_loader.load_csv("vendas_ingresso_rows.csv")
    if vendas_data:
        logger.info(f"✅ CSV carregado: vendas_ingresso_rows.csv ({len(vendas_data)} linhas)")
    else:
        logger.warning("⚠️  CSV vendas_ingresso_rows.csv não encontrado ou vazio")

if __name__ == "__main__":
    import uvicorn
    from config import settings
    uvicorn.run(app, host="0.0.0.0", port=settings.port)

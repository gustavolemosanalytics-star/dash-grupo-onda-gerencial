"""
Vercel Serverless Function - Main API entry point
Este arquivo adapta o FastAPI para funcionar como serverless function no Vercel
"""

import sys
from pathlib import Path

# Adiciona o diretório backend ao path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Importa a aplicação FastAPI do backend
from main import app

# O Vercel espera uma variável chamada 'app' ou uma função handler
# Como estamos usando FastAPI, exportamos a app diretamente

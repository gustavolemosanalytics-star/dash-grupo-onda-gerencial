#!/bin/bash

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual Python..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Instalando dependências..."
pip install -q -r requirements.txt

echo "Iniciando servidor FastAPI..."
python main.py

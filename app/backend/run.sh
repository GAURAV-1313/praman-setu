#!/usr/bin/env bash
# Start the Praman Setu demo API on http://localhost:8000 (offline; synthetic data).
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f model/model.json ] || [ ! -f ../../data/synthetic/applications.json ]; then
  echo "First run: generating synthetic data, training and evaluating the model..."
  uv run python gen_synthetic.py
  uv run python train_model.py
  uv run python evaluate.py
fi
exec uv run uvicorn api:app --host 127.0.0.1 --port "${PORT:-8000}" "$@"

#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "==> Installing frontend dependencies..."
cd "$CLAUDE_PROJECT_DIR/frontend"
npm install

echo "==> Setting up backend virtual environment..."
cd "$CLAUDE_PROJECT_DIR/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt --quiet

echo "export PATH=$CLAUDE_PROJECT_DIR/backend/.venv/bin:\$PATH" >> "$CLAUDE_ENV_FILE"
echo "export PYTHONPATH=$CLAUDE_PROJECT_DIR/backend" >> "$CLAUDE_ENV_FILE"

echo "==> Done."

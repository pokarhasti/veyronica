# =============================================================================
# Veyronica — Makefile
# =============================================================================

.PHONY: install migrate seed reset dev worker test

# Install backend dependencies
install:
	cd backend && pip install -e ".[dev]"

# Run SQL migration against DATABASE_URL_SYNC
migrate:
	cd backend && python -c "from app.db import get_sync_engine; from sqlalchemy import text; engine = get_sync_engine(); conn = engine.connect(); sql = open('../backend/migrations/001_initial.sql').read(); conn.execute(text(sql)); conn.commit(); conn.close(); print('✅ Migration complete')"

# Seed demo data
seed:
	cd backend && python -m scripts.seed

# Full reset (clear + re-seed)
reset:
	cd backend && python -m scripts.seed reset

# Start FastAPI dev server
dev:
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Start Temporal worker
worker:
	cd backend && python -m app.temporal.worker

# Run tests
test:
	cd backend && pytest tests/ -v

# Start frontend dev server
frontend:
	cd frontend && npm run dev

# Docker compose (when Docker is available)
up:
	docker compose up -d --build

down:
	docker compose down

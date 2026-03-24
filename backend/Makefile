.PHONY: help up down dev migrate seed test lint smoke e2e gen-chars gen-audio llm-test deploy

help:
	@echo "Usage:"
	@echo "  make up           - Start dev services (docker-compose)"
	@echo "  make down         - Stop services"
	@echo "  make dev          - Start API with hot reload"
	@echo "  make migrate      - Generate and apply Alembic migration"
	@echo "  make seed         - Seed curriculum data"
	@echo "  make seed-reset   - Drop all tables and re-seed"
	@echo "  make verify       - Verify seed data integrity"
	@echo "  make test         - Run unit tests"
	@echo "  make smoke        - Run API smoke test"
	@echo "  make e2e          - Run full E2E integration test"
	@echo "  make llm-test     - Test LLM providers"
	@echo "  make gen-chars    - Generate character SVG images"
	@echo "  make gen-audio    - Generate TTS audio files"
	@echo "  make lint         - Run linter"
	@echo "  make deploy       - Production deploy"

up:
	docker compose up -d

down:
	docker compose down

dev:
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

migrate:
	alembic revision --autogenerate -m "$(msg)"
	alembic upgrade head

migrate-up:
	alembic upgrade head

migrate-down:
	alembic downgrade -1

seed:
	python -m app.scripts.seed_curriculum

seed-reset:
	python -m app.scripts.seed_curriculum --reset

verify:
	python -m app.scripts.verify_seed_data

test:
	python -m pytest tests/ -v

smoke:
	bash tests/smoke_test.sh

e2e:
	python -m tests.test_e2e_flow

llm-test:
	python -m tests.test_llm_integration --all

gen-chars:
	python -m app.scripts.generators.generate_characters

gen-audio:
	pip install --quiet edge-tts
	python -m app.scripts.generators.generate_audio --engine edge

lint:
	ruff check app/ tests/
	ruff format --check app/ tests/

deploy:
	cd ../deploy && chmod +x deploy.sh && ./deploy.sh

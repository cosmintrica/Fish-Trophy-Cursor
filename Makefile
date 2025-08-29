.PHONY: help install dev build lint type-check db-generate db-push db-studio clean

help: ## Show this help message
	@echo "🎣 Romanian Fishing Hub - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	pnpm install

dev: ## Start development servers (client + API)
	pnpm dev

dev-client: ## Start only client development server
	pnpm dev:client

dev-api: ## Start only API development server
	pnpm dev:api

build: ## Build for production
	pnpm build

build-client: ## Build only client
	pnpm build:client

build-api: ## Build only API
	pnpm build:api

lint: ## Run linting
	pnpm lint

lint-fix: ## Fix linting issues
	pnpm lint:fix

type-check: ## Run TypeScript type checking
	pnpm type-check

db-generate: ## Generate database migrations
	pnpm db:generate

db-push: ## Push database schema changes
	pnpm db:push

db-studio: ## Open Drizzle Studio
	pnpm db:studio

clean: ## Clean build artifacts
	rm -rf client/dist api/.vercel packages/db/migrations
	rm -rf node_modules client/node_modules api/node_modules packages/db/node_modules

setup: ## Initial setup (install + husky + env files)
	pnpm install
	pnpm exec husky install
	@if [ ! -f "client/.env.local" ]; then cp client/env.example client/.env.local; fi
	@if [ ! -f "api/.env.local" ]; then cp api/env.example api/.env.local; fi
	@echo "✅ Setup complete! Configure your .env files and run 'make dev'"

docker-up: ## Start development database with Docker
	docker-compose up -d

docker-down: ## Stop development database
	docker-compose down

docker-logs: ## View database logs
	docker-compose logs -f db

# Cabinet Quoting System - Docker Management Makefile
# Following 2025 DevOps best practices for container orchestration

.PHONY: help build up down restart logs status health clean prune backup restore

# Default target
help: ## Show this help message
	@echo "Cabinet Quoting System - Docker Management Commands"
	@echo "=================================================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development commands
dev-up: ## Start all services in development mode
	@echo "🚀 Starting Cabinet Quoting System in development mode..."
	docker-compose up -d
	@echo "✅ All services started! Check status with: make status"

dev-build: ## Build all services for development
	@echo "🏗️  Building all services..."
	docker-compose build --no-cache
	@echo "✅ Build complete!"

dev-logs: ## Follow logs for all services
	docker-compose logs -f

dev-down: ## Stop all development services
	@echo "🛑 Stopping all services..."
	docker-compose down
	@echo "✅ All services stopped!"

# Production commands
prod-up: ## Start all services in production mode
	@echo "🚀 Starting Cabinet Quoting System in production mode..."
	docker-compose -f docker-compose.yml up -d
	@echo "✅ Production services started!"

prod-build: ## Build all services for production
	@echo "🏗️  Building production images..."
	docker-compose -f docker-compose.yml build --no-cache
	@echo "✅ Production build complete!"

prod-logs: ## Follow production logs
	docker-compose -f docker-compose.yml logs -f

prod-down: ## Stop production services
	@echo "🛑 Stopping production services..."
	docker-compose -f docker-compose.yml down
	@echo "✅ Production services stopped!"

# Management commands
restart: ## Restart all services
	@echo "🔄 Restarting all services..."
	docker-compose restart
	@echo "✅ Services restarted!"

status: ## Show status of all containers
	@echo "📊 Container Status:"
	@echo "==================="
	@docker-compose ps

health: ## Check health of all services
	@echo "🏥 Health Check Results:"
	@echo "======================="
	@docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "Individual Service Health:"
	@echo "-------------------------"
	@docker exec cabinet-frontend curl -s http://localhost:3000/api/health 2>/dev/null && echo "✅ Frontend: Healthy" || echo "❌ Frontend: Unhealthy"
	@docker exec cabinet-admin curl -s http://localhost:3001/api/health 2>/dev/null && echo "✅ Admin: Healthy" || echo "❌ Admin: Unhealthy"
	@docker exec cabinet-backend curl -s http://localhost:3002/health 2>/dev/null && echo "✅ Backend: Healthy" || echo "❌ Backend: Unhealthy"
	@docker exec cabinet-quote-engine curl -s http://localhost:3003/health 2>/dev/null && echo "✅ Quote Engine: Healthy" || echo "❌ Quote Engine: Unhealthy"
	@docker exec cabinet-database pg_isready -U cabinet_user -d cabinet_quoting 2>/dev/null && echo "✅ Database: Healthy" || echo "❌ Database: Unhealthy"

logs: ## Show logs from specific service (usage: make logs SERVICE=frontend)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Please specify a service: make logs SERVICE=frontend|admin|backend|quote-engine|database|nginx"; \
	else \
		echo "📋 Logs for $(SERVICE):"; \
		docker-compose logs -f $(SERVICE); \
	fi

shell: ## Open shell in specific service (usage: make shell SERVICE=backend)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Please specify a service: make shell SERVICE=frontend|admin|backend|quote-engine|database|nginx"; \
	else \
		echo "🐚 Opening shell in $(SERVICE)..."; \
		docker-compose exec $(SERVICE) sh; \
	fi

# Database commands
db-connect: ## Connect to PostgreSQL database
	@echo "🗄️  Connecting to database..."
	docker-compose exec database psql -U cabinet_user -d cabinet_quoting

db-backup: ## Backup database
	@echo "💾 Creating database backup..."
	@mkdir -p ./backups
	docker-compose exec database pg_dump -U cabinet_user cabinet_quoting > ./backups/cabinet_quoting_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in ./backups/"

db-restore: ## Restore database (usage: make db-restore BACKUP=filename.sql)
	@if [ -z "$(BACKUP)" ]; then \
		echo "❌ Please specify backup file: make db-restore BACKUP=filename.sql"; \
	else \
		echo "🔄 Restoring database from $(BACKUP)..."; \
		docker-compose exec -T database psql -U cabinet_user -d cabinet_quoting < ./backups/$(BACKUP); \
		echo "✅ Database restored!"; \
	fi

# Cleanup commands
clean: ## Remove stopped containers and unused images
	@echo "🧹 Cleaning up..."
	docker-compose down --remove-orphans
	docker container prune -f
	docker image prune -f
	@echo "✅ Cleanup complete!"

prune: ## Deep clean - remove all unused containers, networks, images
	@echo "🧹 Deep cleaning Docker system..."
	@echo "⚠️  This will remove ALL unused Docker resources!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo ""; \
		docker system prune -af; \
		docker volume prune -f; \
		echo "✅ Deep clean complete!"; \
	else \
		echo ""; \
		echo "❌ Deep clean cancelled."; \
	fi

reset: ## Complete reset - rebuild everything from scratch
	@echo "🔄 Complete system reset..."
	@echo "⚠️  This will destroy all data and rebuild everything!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo ""; \
		make clean; \
		docker-compose down -v; \
		docker-compose build --no-cache; \
		docker-compose up -d; \
		echo "✅ System reset complete!"; \
	else \
		echo ""; \
		echo "❌ Reset cancelled."; \
	fi

# Development utilities
install: ## Install dependencies in all services
	@echo "📦 Installing dependencies..."
	docker-compose run --rm frontend npm install
	docker-compose run --rm admin-interface npm install
	docker-compose run --rm backend npm install
	docker-compose run --rm quote-engine npm install
	@echo "✅ Dependencies installed!"

test: ## Run tests in all services
	@echo "🧪 Running tests..."
	docker-compose run --rm backend npm test
	docker-compose run --rm quote-engine npm test
	@echo "✅ Tests complete!"

# Monitoring commands
monitor: ## Show real-time container stats
	@echo "📊 Real-time container monitoring (press Ctrl+C to stop):"
	docker stats cabinet-frontend cabinet-admin cabinet-backend cabinet-quote-engine cabinet-database cabinet-nginx

urls: ## Show all service URLs
	@echo "🌐 Service URLs:"
	@echo "==============="
	@echo "Frontend (Customer):  http://localhost:3000"
	@echo "Admin Interface:      http://localhost:3001"
	@echo "Backend API:          http://localhost:3002"
	@echo "Quote Engine:         http://localhost:3003"
	@echo "Database:             localhost:5432"
	@echo "Nginx (Main):         http://localhost:80"
	@echo ""
	@echo "API Documentation:    http://localhost:3002/api-docs"
	@echo "Quote API Docs:       http://localhost:3003/api-docs"
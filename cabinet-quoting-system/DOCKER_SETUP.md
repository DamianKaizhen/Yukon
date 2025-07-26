# Cabinet Quoting System - Docker Multi-Container Setup

## Overview

This document provides comprehensive instructions for the Docker-based multi-container setup of the Cabinet Quoting System. The setup follows 2025 Docker best practices including security hardening, multi-stage builds, and optimized container orchestration.

## Architecture

### 6-Service Container Architecture

1. **Frontend** (Port 3000): React/Next.js customer interface
2. **Admin Interface** (Port 3001): React admin dashboard
3. **Backend API** (Port 3002): Express.js REST API
4. **Quote Engine** (Port 3003): PDF generation service
5. **Database** (Port 5432): PostgreSQL with persistent storage
6. **Nginx** (Port 80/443): Reverse proxy and load balancer

### Network Architecture

```
Internet → Nginx (80/443) → Frontend (3000)
                          → Admin (3001)
                          → Backend API (3002)
                          → Quote Engine (3003)
                            ↓
                          Database (5432)
```

## Quick Start

### Prerequisites

- Docker 24.0+ 
- Docker Compose 2.20+
- Make (optional, for convenience commands)

### Development Setup

1. **Clone and navigate to project:**
   ```bash
   cd /home/damian/yukon-projects/cabinet-quoting-system
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your specific values
   ```

3. **Start all services:**
   ```bash
   # Using make (recommended)
   make dev-up

   # Or using docker-compose directly
   docker-compose up -d
   ```

4. **Check service health:**
   ```bash
   make health
   # Or
   docker-compose ps
   ```

5. **Access services:**
   - Frontend: http://localhost:3000
   - Admin: http://localhost:3001
   - API: http://localhost:3002
   - Nginx: http://localhost:80

### Production Setup

1. **Build production images:**
   ```bash
   make prod-build
   ```

2. **Start production services:**
   ```bash
   make prod-up
   ```

## Configuration Files

### Core Configuration

- `docker-compose.yml`: Production configuration with security hardening
- `docker-compose.override.yml`: Development overrides (auto-merged)
- `.env.example`: Environment variables template
- `Makefile`: Management commands for easy operation

### Service-Specific Files

- `frontend/Dockerfile`: Multi-stage React/Next.js container
- `admin-interface/Dockerfile`: Multi-stage admin dashboard container
- `backend/Dockerfile`: Multi-stage Express.js API container
- `quote-engine/Dockerfile`: Multi-stage PDF generation service
- `nginx/Dockerfile`: Hardened Nginx reverse proxy
- `nginx/nginx.conf`: Production Nginx configuration
- `nginx/nginx.dev.conf`: Development Nginx configuration

## Security Features (2025 Best Practices)

### Container Security
- Non-root users in all containers
- Read-only file systems where possible
- Minimal Linux capabilities (CAP_DROP/CAP_ADD)
- Security options (`no-new-privileges`)
- Multi-stage builds to minimize attack surface

### Network Security
- Isolated Docker network
- Service-to-service communication only
- Rate limiting on API endpoints
- CORS protection
- Security headers (CSP, XSS, etc.)

### Data Security
- PostgreSQL with SCRAM-SHA-256 authentication
- Persistent volumes with proper permissions
- Secrets management via environment variables
- SSL/TLS ready configuration

## Storage and Persistence

### Persistent Volumes

```yaml
volumes:
  postgres-data: ./data/postgres          # Database files
  backend-uploads: ./data/uploads         # File uploads
  quote-pdfs: ./data/quote-pdfs          # Generated PDFs
  nginx-logs: ./data/nginx-logs          # Access logs
```

### Backup Strategy

```bash
# Database backup
make db-backup

# Manual backup
docker-compose exec database pg_dump -U cabinet_user cabinet_quoting > backup.sql

# Restore database
make db-restore BACKUP=backup.sql
```

## Development Workflow

### Hot Reload Configuration

The development override file enables:
- Live code reloading for all Node.js services
- Volume mounts for source code
- Debugger ports exposed (9229, 9230)
- Relaxed security for development convenience

### Debugging

```bash
# View logs
make logs SERVICE=backend

# Open shell in container
make shell SERVICE=backend

# Monitor container stats
make monitor

# Check health status
make health
```

### Development Commands

```bash
# Install dependencies
make install

# Run tests
make test

# View all service URLs
make urls

# Restart specific service
docker-compose restart backend
```

## Production Deployment

### Environment Variables

Required production environment variables:

```bash
# Security
POSTGRES_PASSWORD=strong-production-password
JWT_SECRET=256-bit-secure-jwt-secret

# API Configuration
CORS_ORIGIN=https://yourdomain.com
API_PORT=3002

# Email (optional)
SMTP_HOST=your-smtp-server
SMTP_USER=your-email
SMTP_PASS=your-password
```

### SSL/HTTPS Setup

1. **Obtain SSL certificates:**
   ```bash
   # Let's Encrypt example
   certbot certonly --standalone -d yourdomain.com
   ```

2. **Place certificates:**
   ```bash
   cp fullchain.pem nginx/ssl/cert.pem
   cp privkey.pem nginx/ssl/key.pem
   ```

3. **Update Nginx configuration for your domain**

### Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups configured
- [ ] Monitoring and logging set up
- [ ] Resource limits configured
- [ ] Security scanning completed

## Monitoring and Maintenance

### Health Checks

All services include health checks:
- **Frontend/Admin**: HTTP health endpoints
- **Backend/Quote Engine**: API health endpoints
- **Database**: pg_isready checks
- **Nginx**: Basic HTTP response

### Log Management

```bash
# Follow all logs
make dev-logs

# Service-specific logs
make logs SERVICE=backend

# Production logs
make prod-logs
```

### Performance Monitoring

```bash
# Real-time container stats
make monitor

# Container resource usage
docker stats

# Service status
make status
```

## Troubleshooting

### Common Issues

1. **Containers won't start:**
   ```bash
   # Check logs
   docker-compose logs

   # Rebuild images
   make clean && make dev-build
   ```

2. **Database connection issues:**
   ```bash
   # Check database logs
   make logs SERVICE=database

   # Connect to database
   make db-connect
   ```

3. **Port conflicts:**
   ```bash
   # Check what's using ports
   netstat -tulpn | grep :3000

   # Stop conflicting services
   sudo systemctl stop apache2  # Example
   ```

### Reset Commands

```bash
# Soft reset (restart services)
make restart

# Clean restart (remove containers)
make clean && make dev-up

# Complete reset (nuclear option)
make reset  # WARNING: Destroys all data
```

## Management Commands Reference

| Command | Description |
|---------|-------------|
| `make dev-up` | Start development environment |
| `make prod-up` | Start production environment |
| `make status` | Show container status |
| `make health` | Check service health |
| `make logs SERVICE=name` | View service logs |
| `make shell SERVICE=name` | Open shell in container |
| `make db-backup` | Backup database |
| `make clean` | Clean up containers |
| `make urls` | Show all service URLs |

## Next Steps for Agent 1 (Database Architect)

The Docker environment is now ready for database setup:

1. **Containers are configured** - PostgreSQL container ready
2. **Persistent storage** - Database data directory created
3. **Initialization scripts** - `/database/init/` folder prepared
4. **Connection ready** - Database accessible at `localhost:5432`

**Recommended next steps:**
1. Design and implement the database schema
2. Import the CSV data (1,635 cabinet records)
3. Create indexes for optimal search performance
4. Set up data validation and constraints

The database container will automatically run any `.sql` files in `/database/init/` on first startup.

## File Structure Summary

```
cabinet-quoting-system/
├── docker-compose.yml              # Production configuration
├── docker-compose.override.yml     # Development overrides
├── .env.example                    # Environment template
├── Makefile                        # Management commands
├── DOCKER_SETUP.md                # This documentation
├── nginx/                          # Reverse proxy
│   ├── Dockerfile
│   ├── nginx.conf                  # Production config
│   ├── nginx.dev.conf             # Development config
│   └── ssl/                       # SSL certificates
├── frontend/                       # Customer interface
│   ├── Dockerfile
│   └── package.json
├── admin-interface/               # Admin dashboard
│   ├── Dockerfile
│   └── package.json
├── backend/                       # REST API
│   ├── Dockerfile
│   └── package.json
├── quote-engine/                  # PDF generation
│   ├── Dockerfile
│   └── package.json
├── database/                      # Database setup
│   └── init/                      # Initialization scripts
└── data/                          # Persistent storage
    ├── postgres/                  # Database files
    ├── uploads/                   # File uploads
    ├── quote-pdfs/               # Generated PDFs
    └── nginx-logs/               # Access logs
```

---

*This Docker setup provides a production-ready, secure, and scalable foundation for the Cabinet Quoting System following 2025 container best practices.*
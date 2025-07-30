# Quote Engine Dockerfile - Complete Quote Processing Service
# Multi-stage build for production optimization

# Base Node.js image with security updates
FROM node:20-alpine AS base
RUN apk update && apk upgrade && \
    apk add --no-cache \
        curl \
        ca-certificates \
        dumb-init \
        && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 quote-engine

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Development stage
FROM base AS development
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN mkdir -p storage/pdfs storage/temp logs assets && \
    chown quote-engine:nodejs storage logs assets
USER quote-engine
EXPOSE 3003
ENV PORT 3003
CMD ["npm", "run", "dev"]

# Build stage (for TypeScript compilation)
FROM base AS builder
COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci --include=dev
COPY src/ ./src/
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3003

# Copy production dependencies and built application
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Create necessary directories with proper permissions
RUN mkdir -p storage/pdfs storage/temp logs assets && \
    chown -R quote-engine:nodejs storage logs assets

# Copy static assets
COPY assets/ ./assets/

# Copy environment example
COPY .env.example ./

# Switch to non-root user
USER quote-engine

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
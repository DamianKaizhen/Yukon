# Backend Dockerfile - Express.js REST API
# Multi-stage build following 2025 best practices

# Base Node.js image with security updates
FROM node:20-alpine AS base
RUN apk update && apk upgrade && \
    apk add --no-cache \
        curl \
        ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 express

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN mkdir -p uploads && chown express:nodejs uploads
USER express
EXPOSE 3002 9229
ENV PORT 3002
CMD ["npm", "run", "dev"]

# Build stage (for TypeScript compilation)
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV production

# Copy production dependencies and built application
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Create uploads directory with proper permissions
RUN mkdir -p uploads && \
    chown -R express:nodejs /app

USER express

EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

CMD ["node", "dist/index.js"]
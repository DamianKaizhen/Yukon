# Quote Engine Dockerfile - PDF Generation Service
# Multi-stage build following 2025 best practices

# Base Node.js image with security updates and Puppeteer dependencies
FROM node:20-alpine AS base
RUN apk update && apk upgrade && \
    apk add --no-cache \
        curl \
        ca-certificates \
        chromium \
        nss \
        freetype \
        freetype-dev \
        harfbuzz \
        ca-certificates \
        ttf-freefont && \
    rm -rf /var/cache/apk/*

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 quote-engine

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
RUN mkdir -p pdf-storage && chown quote-engine:nodejs pdf-storage
USER quote-engine
EXPOSE 3003 9230
ENV PORT 3003
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

# Copy template files for PDF generation
COPY --from=builder /app/templates ./templates

# Create PDF storage directory with proper permissions
RUN mkdir -p pdf-storage && \
    chown -R quote-engine:nodejs /app

USER quote-engine

EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

CMD ["node", "dist/index.js"]
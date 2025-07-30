# Nginx Dockerfile following 2025 security best practices
FROM nginx:1.25-alpine AS base

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        curl \
        ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user for nginx (use existing nginx group)
RUN adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx-custom

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Create necessary directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx-custom:nginx /var/cache/nginx /var/log/nginx /var/run

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Set proper permissions
RUN chown -R nginx-custom:nginx /etc/nginx

# Switch to non-root user
USER nginx-custom

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
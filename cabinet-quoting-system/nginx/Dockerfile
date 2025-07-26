# Nginx Dockerfile following 2025 security best practices
FROM nginx:1.25-alpine AS base

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        curl \
        ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user for nginx
RUN addgroup -g 101 -S nginx-custom && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx-custom -g nginx-custom nginx-custom

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Create necessary directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx-custom:nginx-custom /var/cache/nginx /var/log/nginx /var/run

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Set proper permissions
RUN chown -R nginx-custom:nginx-custom /etc/nginx

# Switch to non-root user
USER nginx-custom

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
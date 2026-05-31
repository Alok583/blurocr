FROM node:20-alpine

# Install system dependencies needed by Sharp (libvips) and Tesseract
RUN apk add --no-cache \
    vips-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install dependencies (Sharp will build native bindings for Alpine)
RUN npm ci --omit=dev

# Copy application source
COPY src/     ./src/
COPY bin/     ./bin/
COPY browser/ ./browser/

# Create temp directory for file uploads
RUN mkdir -p /tmp/blurocr

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Run as non-root user for security
RUN addgroup -S blurocr && adduser -S blurocr -G blurocr
USER blurocr

# Start the REST API server
CMD ["node", "src/server.js"]

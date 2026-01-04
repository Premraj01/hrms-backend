# ============================================
# HRMS Backend Dockerfile for AWS Deployment
# Multi-stage build for optimized production image
# ============================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
# Using --legacy-peer-deps to handle NestJS version conflicts
RUN npm ci --legacy-peer-deps

# Generate Prisma client (binary targets defined in schema.prisma)
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============================================
# Stage 2: Production stage
FROM node:20-alpine AS production

# Install runtime dependencies for native modules and OpenSSL
RUN apk add --no-cache python3 make g++ openssl openssl-dev

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
# Using --legacy-peer-deps to handle NestJS version conflicts
RUN npm ci --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Copy generated Prisma client from builder stage (avoids version mismatch)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory with proper permissions
RUN mkdir -p uploads/profile-photos && \
    chown -R nestjs:nodejs uploads

# Switch to non-root user
USER nestjs

# Expose the application port (default 3000, can be overridden at runtime)
EXPOSE ${PORT:-3000}

# Health check - uses PORT env var at runtime
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/api/health || exit 1

# Set default environment variables (can be overridden at runtime via docker-compose or -e flag)
ENV NODE_ENV=production \
    PORT=3000

# Start the application
# Note: Run migrations separately before deployment (e.g., via CI/CD or a migration job)
# Example: docker run --rm erp-docker-app npx prisma migrate deploy
CMD ["node", "dist/src/main.js"]


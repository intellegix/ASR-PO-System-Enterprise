# ASR Purchase Order System - Production Dockerfile
# Optimized for AWS App Runner deployment

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY web/package*.json ./
COPY web/prisma ./prisma/

# Install dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY web/ ./

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application with standalone output
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone application from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the port that App Runner expects
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check for AWS App Runner
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').request({hostname:'localhost',port:3000,path:'/api/health',timeout:2000}).on('response',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1)).end()"

# Start the Next.js server
CMD ["node", "server.js"]
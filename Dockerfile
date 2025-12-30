# Multi-stage build for MarkThree (TanStack Start app)
FROM node:22-slim AS base
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production image
FROM base AS runner

# Create a non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m -d /home/markthree markthree

# Copy built application from builder
COPY --from=builder --chown=markthree:nodejs /app/.output ./.output
COPY --from=builder --chown=markthree:nodejs /app/package.json ./package.json
COPY --from=builder --chown=markthree:nodejs /app/scripts ./scripts
COPY --from=deps --chown=markthree:nodejs /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Switch to non-root user
USER markthree

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3000',(r)=>{if(r.statusCode!==200)throw new Error(r.statusCode)}).on('error',()=>process.exit(1))"

# Start the server with database initialization
CMD ["sh", "-c", "npm run start"]

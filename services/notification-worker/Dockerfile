# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm and build tools
RUN corepack enable && corepack prepare pnpm@8.9.0 --activate
RUN apk add --no-cache python3 make g++

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./

# Copy internal packages
COPY packages ./packages

# Copy the service
COPY services/notification-worker ./services/notification-worker

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the worker and its workspace dependencies
RUN pnpm --filter notification-worker... build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Follow the repo's pattern of copying node_modules and packages
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/notification-worker ./services/notification-worker

# Re-create the logs directory
RUN mkdir -p logs

# Set environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 3006

# Use the full path as per other services in this repo
CMD ["node", "services/notification-worker/dist/server.js"]

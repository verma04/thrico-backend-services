# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.9.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/user ./services/user

RUN pnpm install

# Build all packages and services that user depends on
RUN pnpm --filter user... build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/user ./services/user

RUN mkdir -p /app/logs

EXPOSE 2222

# HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:2222/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "services/user/dist/server.js"]

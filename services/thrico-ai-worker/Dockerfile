# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.9.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/thrico-ai-worker ./services/thrico-ai-worker

RUN pnpm install

# Build all packages and services that thrico-ai-worker depends on
RUN pnpm --filter thrico-ai-worker... build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/thrico-ai-worker ./services/thrico-ai-worker

RUN mkdir -p /app/logs

# Command to run the worker
CMD ["node", "services/thrico-ai-worker/dist/index.js"]

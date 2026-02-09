# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.9.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/firebase-push ./services/firebase-push

RUN pnpm install

# Build all packages and services that firebase-push depends on
RUN pnpm --filter firebase-push... build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/firebase-push ./services/firebase-push

RUN mkdir -p /app/logs

# The service doesn't seem to expose a port based on package.json, 
# but we can add it if needed later.

CMD ["node", "services/firebase-push/dist/server.js"]

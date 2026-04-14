# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-bullseye-slim AS builder

# Mediasoup requires build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    make \
    gcc \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY services/live/package.json ./services/live/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY services/live/ ./services/live/
COPY tsconfig.json ./

WORKDIR /app/services/live
RUN pnpm build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-bullseye-slim AS runner

RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    make \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/live/dist ./services/live/dist
COPY --from=builder /app/services/live/package.json ./services/live/package.json

WORKDIR /app/services/live

ENV NODE_ENV=production

EXPOSE 5555
# UDP range for WebRTC – you must also expose this range in docker run / compose
EXPOSE 10000-20000/udp

CMD ["node", "dist/server.js"]

# ── Stage 1: Install ALL deps (needed for build) ─────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
# Use ci for reproducible installs; install all deps including devDependencies
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client then compile TypeScript
RUN npx prisma generate && npm run build

# ── Stage 3: Production runtime (minimal image) ───────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install FFmpeg and wget for video composition and health checks
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Non-root user for least-privilege execution
RUN groupadd --system liveops && useradd --system --gid liveops --create-home liveops

# Only copy what the production process needs
COPY --from=builder /app/dist           ./dist
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/prisma         ./prisma
COPY --from=builder /app/package.json   ./package.json

RUN chown -R liveops:liveops /app

USER liveops

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/v1/health || exit 1

CMD ["npm", "run", "start:prod"]

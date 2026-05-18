# ── Stage 1: Install ALL deps (needed for build) ─────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Use ci for reproducible installs; install all deps including devDependencies
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client then compile TypeScript
RUN npx prisma generate && npm run build

# ── Stage 3: Production runtime (minimal image) ───────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Non-root user for least-privilege execution
RUN addgroup -S liveops && adduser -S liveops -G liveops

# Only copy what the production process needs
COPY --from=builder /app/dist           ./dist
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/prisma         ./prisma
COPY --from=builder /app/package.json   ./package.json

# Run pending migrations before the process starts.
# Use an entrypoint wrapper so migrations run once per container start.
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R liveops:liveops /app

USER liveops

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]

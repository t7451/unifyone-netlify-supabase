# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches/ patches/
RUN pnpm install --frozen-lockfile --ignore-scripts=false

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN pnpm build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN apk add --no-cache curl tini
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

# Copy built output and production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY package.json pnpm-lock.yaml .npmrc ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["./docker-entrypoint.sh"]

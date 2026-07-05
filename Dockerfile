# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps against the lockfile (reproducible, integrity-checked).
COPY package*.json ./
RUN npm ci

# Generate the Prisma client, then compile TypeScript.
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Strip dev dependencies for the runtime image.
RUN npm prune --omit=dev

# ── Runtime stage ────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Run as an unprivileged, pre-existing user (node) — never root.
# Copy only what the runtime needs, owned by node.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --chown=node:node package*.json ./

USER node
EXPOSE 4000

# Liveness probe hits the health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Migration should be run as a separate init job/container before deployment.
# Use: docker run --rm <image> npx prisma migrate deploy
# The app container only starts the server.
CMD ["node", "dist/server.js"]

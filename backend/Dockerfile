# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000 \
    NPM_CONFIG_UPDATE_NOTIFIER=false

RUN apt-get update \
 && apt-get install -y --no-install-recommends tini wget ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# node:20-bookworm-slim already provides a non-root `node` user (uid 1000).
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node
EXPOSE 5000
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","server.js"]

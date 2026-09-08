# syntax=docker/dockerfile:1

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim AS base

WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
RUN npm rebuild sqlite3 better-sqlite3 --build-from-source

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY planPolicy.js ./planPolicy.js
COPY apiDocumentation.js ./apiDocumentation.js
COPY lib ./lib
COPY models ./models
COPY middleware ./middleware
COPY routes ./routes

RUN mkdir -p /data
EXPOSE 8080
CMD ["node", "server.js"]
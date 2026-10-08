FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY admin/package.json admin/package.json
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY admin/package.json admin/package.json
RUN npm ci
COPY admin admin
COPY scripts/build.js scripts/build.js
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATA_DIR=/app/server/data
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY admin/package.json admin/package.json
COPY --from=dependencies /app/node_modules node_modules
COPY server/src server/src
COPY --from=build /app/server/public server/public
RUN mkdir -p /app/server/data && chown -R node:node /app
USER node
VOLUME ["/app/server/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/src/index.js"]

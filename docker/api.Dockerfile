FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm turbo build --filter=@dripdesk/api && \
    cp $(find /app/node_modules/.pnpm -name "libquery_engine-linux-musl-openssl-3.0.x.so.node" -path "*/@prisma+client*" | head -1) /app/query-engine.so && \
    chmod +x /app/query-engine.so
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/query-engine.so
EXPOSE 3000
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
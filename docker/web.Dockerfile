FROM node:22-alpine
ARG DRIPDESK_PUBLIC_API_URL
ARG DRIPDESK_PUBLIC_WEB_URL
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN DRIPDESK_PUBLIC_API_URL=${DRIPDESK_PUBLIC_API_URL} \
    DRIPDESK_PUBLIC_WEB_URL=${DRIPDESK_PUBLIC_WEB_URL} \
    pnpm turbo build --filter=@dripdesk/web
EXPOSE 3001
CMD ["node", "apps/web/.output/server/index.mjs"]
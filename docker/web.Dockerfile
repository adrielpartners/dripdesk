FROM node:22-alpine
ARG NUXT_PUBLIC_API_URL=https://api.dripdesk.net
ARG NUXT_PUBLIC_WEB_URL=https://app.dripdesk.net
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN NUXT_PUBLIC_API_URL=${NUXT_PUBLIC_API_URL} \
    NUXT_PUBLIC_WEB_URL=${NUXT_PUBLIC_WEB_URL} \
    pnpm turbo build --filter=@dripdesk/web
EXPOSE 3001
CMD ["node", "apps/web/.output/server/index.mjs"]

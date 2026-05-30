FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm turbo build --filter=@dripdesk/worker

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/worker/package.json apps/worker/package.json
COPY --from=build /app/packages/config/package.json packages/config/package.json
COPY --from=build /app/packages/database/package.json packages/database/package.json
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/apps/worker/dist apps/worker/dist
COPY --from=build /app/packages/config/dist packages/config/dist
COPY --from=build /app/packages/database/dist packages/database/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/node_modules node_modules
CMD ["node", "apps/worker/dist/main.js"]
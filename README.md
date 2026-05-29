# DripDesk

DripDesk is a mobile-first micro-course delivery SaaS for sending short lessons through SMS, Telegram, and email.

## Local Development

Prerequisites:

- Node.js 20+
- pnpm through Corepack
- Docker with Compose

Install dependencies:

```bash
corepack enable
pnpm install
```

Start local infrastructure:

```bash
pnpm docker:up
```

Run database migrations once Postgres is healthy:

```bash
DRIPDESK_DATABASE_URL="postgresql://dripdesk:dripdesk@localhost:5432/dripdesk?schema=public" pnpm --filter @dripdesk/database migrate:deploy
```

Start app processes in development mode:

```bash
pnpm dev
```

Default local URLs:

- Web: `http://localhost:3001`
- API: `http://localhost:3000/api`
- API health: `http://localhost:3000/api/health`

## Docker Local Stack

The local Compose file can build and run web, API, worker, Postgres, and Redis:

```bash
docker compose -f docker/docker-compose.yml up --build
```

Postgres and Redis are exposed locally for development on ports `5432` and `6379`.

## Production-Style Docker

`docker/docker-compose.prod.yml` is a production-style example. It keeps Postgres and Redis on an internal Docker network and exposes only web/API through an external `edge` network intended for a reverse proxy such as Traefik.

Before using it:

1. Create the external Docker network used by Traefik:

```bash
docker network create edge
```

2. Create a production `.env` from `.env.example` and set real values for all production secrets.
3. Set `DRIPDESK_POSTGRES_PASSWORD` in the shell or deployment environment.
4. Replace the example Traefik host labels in `docker/docker-compose.prod.yml`.

Run:

```bash
docker compose -f docker/docker-compose.prod.yml up --build -d
```

Run migrations as a one-off command from the built API image or a CI/CD step before serving traffic.

## Verification

Common checks:

```bash
pnpm typecheck
pnpm build
pnpm audit
pnpm --filter @dripdesk/database test
pnpm --filter @dripdesk/worker test
```

Root `pnpm test` runs the configured package test scripts. Live smoke tests still require Docker/Postgres/Redis and provider credentials.

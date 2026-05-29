# Deployment

Phase 20 adds Dockerfiles and Compose examples for local and production-style deployment.

## Dockerfiles

Runtime images:

- `docker/web.Dockerfile`
- `docker/api.Dockerfile`
- `docker/worker.Dockerfile`

The API and worker images generate Prisma Client during build.

## Local Compose

`docker/docker-compose.yml` runs:

- web
- API
- worker
- Postgres
- Redis

Postgres and Redis expose local ports for development.

## Production-Style Compose

`docker/docker-compose.prod.yml` keeps Postgres and Redis on an internal Docker network.

The web and API services attach to an external `edge` network and include example Traefik labels. Replace example hosts before use.

Production assumptions:

- TLS termination is handled by Traefik or another reverse proxy.
- production secrets are provided through `.env` or the deployment environment.
- production startup fails when required public URLs, database/Redis URLs, auth/encryption secrets, or Stripe billing values are missing.
- Swagger API docs are disabled by default in production unless `DRIPDESK_ENABLE_API_DOCS=true` is explicitly configured.
- database migrations run before serving traffic.
- Postgres has durable volume backups.
- Redis is not publicly exposed.

## Health

API health endpoint:

```text
GET /api/health
```

Compose healthchecks use API and web HTTP checks where practical. The worker is supervised by Docker restart policy and depends on healthy Postgres/Redis.

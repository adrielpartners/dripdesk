# Deployment

DripDesk has local and production-style Compose examples, plus a Hostinger-specific Compose file used by the current deployment. Last updated: 2026-09-25.

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

Postgres and Redis expose loopback-only ports for development. The local stack also includes Mailpit for SMTP campaign testing; see `README.md` for the smoke-test command.

## Production-Style Compose

`docker/docker-compose.prod.yml` keeps Postgres and Redis on an internal Docker network.

The web and API services attach to an external `edge` network and include example Traefik labels. Replace example hosts before use. The worker also joins a dedicated outbound bridge network so it can resolve and reach email, SMS, and Telegram providers without exposing a port or joining the shared reverse-proxy network; Postgres and Redis remain on the internal network only.

Production assumptions:

- TLS termination is handled by Traefik or another reverse proxy.
- production secrets are provided through `.env` or the deployment environment.
- production startup fails when required public URLs, database/Redis URLs, auth/encryption secrets, or Stripe billing values are missing.
- Swagger API docs are disabled by default in production unless `DRIPDESK_ENABLE_API_DOCS=true` is explicitly configured.
- database migrations run before serving traffic.
- Postgres has durable volume backups.
- Redis is not publicly exposed.

## Current Hostinger Deployment

`docker/docker-compose.hostinger.yml` is the deployed layout on the Hostinger VPS under `/opt/dripdesk-release`. It uses prebuilt `ghcr.io/adrielpartners/dripdesk-{api,worker,web}:latest` images. Traefik routes `app.dripdesk.net` to web and `api.dripdesk.net` to API. Postgres and Redis use private Docker networking; the worker has outbound network access but no published port. The VPS `.env` and database volume are production state and must be preserved.

Pushing to `main` triggers `.github/workflows/docker-build.yml`. Lint, typecheck, and tests must pass before it builds and publishes the three images to GHCR. That is an image-publish step, **not** a complete deployment: the VPS must pull the new images and recreate the services. Apply any new database migration before replacing API/worker containers. A documentation-only push will also trigger checks and image builds under the current workflow.

For a schema release, first confirm the migration files and backup decision, then run Prisma `migrate deploy` against the production database from a one-off API image/container using the VPS environment, and only then refresh services with the new images. Do not use `prisma migrate dev` in production. Verify API health and the relevant end-to-end flow afterward. Use `docker compose -p dripdesk --project-directory /opt/dripdesk-release --env-file .env -f docker/docker-compose.hostinger.yml` from `/opt/dripdesk-release`; omitting `-p dripdesk` selects a different project, while omitting `--project-directory` looks for `docker/.env` instead of the live root `.env`. On 2026-09-22, the subscriber-intake migration required a temporary `apk add --no-cache openssl` because the then-current API image lacked OpenSSL. The API and worker Dockerfiles now install OpenSSL and copy Prisma's native query engine to a `.node` filename. Verify the release image can run `prisma -v` and `prisma migrate deploy` before applying a migration. Do not assume a newly pushed image has been pulled or a migration applied.

The six-character campaign ID migration replaces campaign primary keys and all campaign foreign keys. Coordinate it as a maintenance release: drain queued work, stop API and worker writes, apply the migration, then start matching API/worker/web images. Inspect any remaining queued job payloads for old campaign UUIDs before restarting workers. Old campaign URLs and webhook sender configurations must be replaced with the new IDs. Do not run old application images against the migrated schema or new images against the old schema.

The production intake endpoint and one-time key contract are documented in `docs/subscriber-intake.md`. The production campaign intake-to-delivery path is still awaiting a full smoke test; see `docs/release-checklist.md`.

## Health

API health endpoint:

```text
GET /api/health
```

Compose healthchecks use API and web HTTP checks where practical. The worker is supervised by Docker restart policy and depends on healthy Postgres/Redis.

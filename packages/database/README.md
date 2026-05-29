# @dripdesk/database

This package owns the DripDesk PostgreSQL schema, Prisma migrations, Prisma Client generation, and database seed entrypoint.

## Current Foundation

Phase 3 intentionally includes only the base tenant/auth tables:

- `organizations`
- `users`
- `organization_members`

Later product tables should be added in their roadmap phases through new migrations.

## Commands

```bash
DRIPDESK_DATABASE_URL="postgresql://dripdesk:dripdesk@localhost:5432/dripdesk?schema=public" pnpm db:generate
DRIPDESK_DATABASE_URL="postgresql://dripdesk:dripdesk@localhost:5432/dripdesk?schema=public" pnpm --filter @dripdesk/database migrate:deploy
```

Prisma migrations live in `packages/database/prisma/migrations` because Prisma expects migrations beside the schema file.

# Tenant Scoping

DripDesk resolves organization context on the server before organization-scoped service logic runs.

## Current Organization Resolution

For authenticated API requests, the current organization is resolved by `CurrentOrganizationGuard`.

Resolution order:

1. Route parameter `organizationId`
2. Header `x-dripdesk-organization-id`
3. The authenticated user's primary organization from the JWT/user lookup
4. The first available membership

The resolved organization is accepted only after the API verifies an `organization_members` row for the authenticated user.

Clients may use `GET /organizations` for organization switcher data and then send `x-dripdesk-organization-id` on organization-scoped requests. The header is only a selector; it is not authorization.

## Service and Repository Pattern

Organization-scoped controllers should:

1. Require `JwtAuthGuard`.
2. Require `CurrentOrganizationGuard`.
3. Require `RolesGuard` when owner/admin permissions are needed.
4. Pass `TenantContext` to services.

Organization-scoped services and repositories should accept `TenantContext` and include `tenant.organizationId` in every tenant-owned query.

Do not pass raw client-provided organization IDs into repositories for tenant-owned data after Phase 5.

## Roles

Owner/admin permissions are based on the current organization membership role.

The global user role is retained as account-level classification, but organization admin routes must rely on membership context so a user cannot use access in one organization to reach another.

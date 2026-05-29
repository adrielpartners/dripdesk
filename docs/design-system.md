# Design System Foundation

Phase 6 establishes the shared visual foundation for DripDesk's Nuxt app.

## Token Files

Global tokens live in:

```text
apps/web/assets/css/tokens.css
apps/web/assets/css/base.css
```

`tokens.css` owns durable design values:

- colors
- typography
- spacing
- radius
- borders
- shadows
- z-index
- motion timing

`base.css` owns app-wide reset, focus, selection, and layout utility rules.

Feature components and pages should use these tokens instead of hardcoded colors, spacing, radius, or shadows.

## Primitive Components

Reusable primitives live in:

```text
apps/web/components/primitives/
```

Current primitives:

- `AppButton`
- `AppCard`
- `AppInput`
- `AppTextarea`
- `AppSelect`
- `AppBadge`
- `AppDialog`
- `AppTable`
- `AppMetricCard`
- `AppEmptyState`

Feature components should compose these primitives before adding new styling patterns.

## Layouts

Basic layout wrappers live in:

```text
apps/web/layouts/
```

Current layouts:

- `default`
- `admin`
- `recipient`
- `auth`

Phase 6 layouts intentionally do not include app navigation. Navigation belongs to Phase 7.


---
name: project-conventions
description: >-
  Mandatory conventions for this codebase (a Laravel + Inertia + React/TypeScript
  app). Consult and follow this whenever building or editing any UI (React .tsx
  components, pages, modals, layouts), implementing or changing any feature that
  needs tests, or defining/moving TypeScript types and interfaces. Apply it even
  when the user doesn't cite these rules by name — it governs when to reuse
  versus create components, the requirement that every change ship with tests,
  and where shared types live. Triggers on any task touching
  resources/js/Components, resources/js/types, tests/Feature, or tests/Unit, or
  any request to add a feature, component, endpoint, page, or type.
---

# Project conventions

Mandatory conventions for this codebase (Laravel + Inertia + React/TypeScript). Follow them during any implementation work — these are requirements, not suggestions. The three areas below apply independently; follow whichever matches the task at hand.

## UI work — reuse existing components first

Before writing a new component or building a one-off page, search the existing
component library and reuse what's there. Specifically:

- Look in `resources/js/Components/` (especially `Components/Core/`,
  `Components/Input/`, `Components/Business/`, `Components/User/`) and the
  layouts under `resources/js/Layouts/`.
- If an admin or first-party flow already does what you need
  (e.g. `AddressDetails`, `FileViewer`, `FileUpload`, `DataTable`, `Modal`,
  `Tabs`, `Input`, `Button`, `StatusBadge`, `StatsCard`), reuse that component
  rather than reimplementing similar markup.
- Prefer composing existing components in a modal or section over creating a
  new page. New pages are only justified when no existing screen pattern fits.
- If an existing component is *almost* right, extend or generalize it (add a
  prop, lift a sub-component) instead of forking a near-duplicate.
- Only create a brand-new component when no existing one is close, and place
  it next to its peers (e.g. `Components/Business/CustomerKycForm.tsx` lives
  with the other Business components).

When you are about to write JSX from scratch, first state which existing
component(s) you considered and why they don't fit.

## Tests are mandatory

- Every feature you implement or update **must** ship with tests that cover
  100% of the new/changed behaviour — happy path, edge cases, validation,
  authorization boundaries, and any branching logic.
- Place tests next to existing test peers: `tests/Feature/...` for HTTP /
  Inertia / API flows, `tests/Unit/...` for pure logic. For business-scoped
  endpoints, mirror the controller path (e.g. `tests/Feature/Business/...`).
- Run the relevant suite before reporting work complete; do not mark a task
  done while any related test fails or is skipped.
- If something is genuinely untestable (third-party SDK side effects, etc.),
  call it out explicitly in the response and explain what was *not* covered
  and why — don't quietly skip.

## Type definitions live in `resources/js/types/`

- All shared TypeScript type/interface definitions belong in
  `resources/js/types/` and follow the existing split:
  - `business.d.ts` — anything scoped to the business app (Business, Customer,
    BusinessUser, Membership, etc.)
  - `transaction.d.ts` — Transaction, CardTransaction, statuses, ledger shapes
  - `dev.d.ts` — developer-settings shapes (API keys, webhooks, IP whitelist)
  - `misc.d.ts` — small cross-cutting helpers (DetailFieldProps, etc.)
  - `global.d.ts` — ambient globals (e.g. `route()`)
  - `index.d.ts` — re-exports everything; import from `@/types` not the leaves.
- Do **not** inline page-prop or row-shape interfaces inside `.tsx` page
  files. Extract them into the matching `*.d.ts` (or create a new one only if
  no existing file fits) and import from `@/types`.
- Component-local prop shapes that are truly private to one component may
  remain in that file; the moment a shape is reused or returned from the
  backend, move it into the types folder.

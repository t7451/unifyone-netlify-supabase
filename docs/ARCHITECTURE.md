# Clean Architecture Conventions

This document defines the **target layering** the codebase is being refactored
toward. It is the convention every refactor unit follows so the modules stay
consistent as they are reshaped from flat files into layered folders.

It is intentionally pragmatic: the goal is clear, testable seams between
transport, business logic, and data access — not a dogmatic clean-architecture
framework. Adopt it incrementally, one module at a time, with **zero behavior
change**.

> Scope note: `docs/03_Technical_Architecture.md` is the product/system canon
> (services, infra, multi-tenancy). _This_ document is the **code-organization
> convention** for the in-flight refactor. When they appear to disagree, this
> document governs folder layout and dependency direction; the canon governs
> runtime/infra.

---

## 1. The dependency rule

Dependencies point **inward**, from transport toward data, and never the
reverse:

```
transport  ->  service (use-cases)  ->  repo (data access)  ->  db
  (index)        (business logic)        (queries)            (driver/schema)
```

- **transport** may import **service**.
- **service** may import **repo**.
- **repo** may import the shared **db** layer and `drizzle/schema`.
- Nothing inner imports something outer. A `repo` must never import its
  `service`; a `service` must never import its `index`/transport. A `repo` must
  not reach into HTTP/tRPC types.
- **shared/** is the innermost kernel: it may be imported by any layer and
  imports nothing from `client/`, `server/`, or app-specific code (only
  `drizzle/schema` for type re-exports).

Why: the inner layers (business rules, data shape) are the stable core; the
outer layers (how a request arrives, how a row is fetched) are details that can
change without rippling inward.

---

## 2. Server routers — `routers/<name>/`

Each tRPC router becomes a folder with three roles:

```
server/routers/<name>/
  index.ts        # transport: the tRPC router. Wires procedures to the
                  #   service. Owns input/output zod schemas, auth/ctx checks,
                  #   and TRPCError mapping. No business logic, no SQL.
  service.ts      # use-cases: the business logic. Pure-ish functions that take
                  #   plain inputs (+ ctx like tenantId) and call the repo.
                  #   Throws domain/HttpError; knows nothing about tRPC.
  repo.ts         # data access: all DB queries for this module. Takes/returns
                  #   plain values and row types. The only layer that touches
                  #   drizzle / the db client for this router.
```

Larger routers may split a role into a folder (`service/`, `repo/`) with its own
barrel `index.ts`, but the role boundary and dependency rule are unchanged.

**Preserve the public export.** `server/routers.ts` (and any aggregator) imports
the router by name. After the refactor, `routers/<name>/index.ts` must export the
**same router value under the same name** so the aggregator and the generated
tRPC client types are byte-for-byte equivalent. Moving a file from
`routers/foo.ts` to `routers/foo/index.ts` keeps the `@/routers/foo` /
`./routers/foo` specifier resolving to the same export.

---

## 3. Server services — layered folders

Standalone service modules under `server/` (e.g. payment, integration, and
automation services) follow the same inward layering when they grow large enough
to warrant it:

```
server/<service>/
  index.ts        # public surface: what the rest of the server imports.
  <use-cases>.ts  # orchestration / business logic.
  <clients/io>.ts # outward adapters (SDK clients, HTTP, webhooks).
```

Signature/verification of webhooks and SDK client construction belong in the
adapter layer; the orchestration layer stays free of transport concerns. As with
routers, **the public export surface is preserved**: importers keep using the
same module specifier and the same exported names.

---

## 4. Client pages — `pages/<Name>/`

Each page becomes a folder that separates render from data/state:

```
client/src/pages/<Name>/
  index.tsx       # render: the component tree + presentational markup.
  use<Name>.ts    # data/state: tRPC queries/mutations, derived state, handlers.
  constants.ts    # static config for the page.
  types.ts        # page-local types.
  utils.ts        # page-local pure helpers.
```

The page component (`index.tsx`) stays a default export so the route table in
`client/src/App.tsx` keeps importing `@/pages/<Name>` unchanged. Data-fetching
logic moves into the `use<Name>` hook, which composes the shared query-hook layer
(below).

---

## 5. Data layer — `server/db/`

`server/db/` is the shared data-access foundation that `repo` files build on:
the db client/connection, transaction helpers, and cross-cutting query
utilities. Repos import from here; nothing in `server/db/` imports a router,
service, or transport type. `drizzle/schema.ts` remains the single source of
truth for table shapes.

## 6. Query-hook layer — `client/src/lib/api/`

`client/src/lib/api/` holds reusable tRPC query/mutation hooks and query-key
helpers shared across pages. A page's `use<Name>` hook composes these rather than
re-deriving query keys or duplicating fetch/cache wiring. This keeps caching and
invalidation consistent and keeps pages thin.

---

## 7. The shared kernel — `shared/`

`shared/` is the innermost, framework-free kernel imported by both client and
server. It contains only cross-cutting, dependency-free building blocks:

| File                | Contents                                               |
| ------------------- | ------------------------------------------------------ |
| `const.ts`          | Cross-cutting constants (cookie names, TTLs, messages) |
| `_core/errors.ts`   | `HttpError` + typed error constructors (source)        |
| `errors.ts`         | Barrel re-exporting `_core/errors`                     |
| `types.ts`          | Unified type entry point (schema types + errors)       |
| `pricing.ts`        | Commerce plan catalog (Starter/Pro/Scale)              |
| `gigPricing.ts`     | Gig-worker plan catalog (separate by design)           |
| `surveys.ts`        | Microsurvey definitions                                |
| `behaviorEvents.ts` | First-party behavioral-event taxonomy + consent        |

Rules for `shared/`:

- **No framework or app imports.** Only `drizzle/schema` (for type re-exports).
- **Stable public paths.** Importers use `@shared/<file>` (tsconfig path) and the
  bare `@shared` alias (vite). Renaming or moving a file is a breaking change;
  if a file must move, leave a re-export at the old path.
- `pricing.ts` and `gigPricing.ts` are **separate on purpose** — do not merge.

---

## 8. The "preserve public exports" invariant

This refactor changes _internal_ structure only. For every module touched:

1. The set of **exported names** stays identical.
2. The **import specifier** other code uses to reach them stays identical
   (file→folder moves rely on `index` resolution to keep the specifier stable).
3. **Runtime behavior** is unchanged — same inputs produce same outputs, same
   errors, same side effects.

If a change would alter any of the three, it is out of scope for the refactor and
must be split into a separate, intentional change.

---

## 9. Adoption checklist (per module)

- [ ] Move file → folder; keep the same public export under the same specifier.
- [ ] Extract data access into `repo`, business logic into `service`, leave
      transport/wiring in `index`.
- [ ] Verify the dependency rule (transport → service → repo; never reverse).
- [ ] `pnpm check && pnpm test && pnpm lint && pnpm build` stay green.
- [ ] No change to generated tRPC types or route table imports.

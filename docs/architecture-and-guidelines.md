# Architecture & Clean Code Guidelines
### Universal Clean Architecture & Coding Standard — React + TypeScript + Redux Toolkit / RTK Query — Feature-First

Machine-readable rule set. Imperative constraints only. Applies to any React + TypeScript application built on Redux Toolkit with RTK Query as its data layer — single-package or modular workspace, browser or desktop. Electron is one supported deployment platform, not the primary target; apps that interface with hardware, CLI tools, or low-level background services are in scope but so are ordinary web apps with no such concerns.

**Normative keywords** (RFC 2119 style): **MUST** / **MUST NOT** / **NEVER** = mandatory, enforced via lint, type-check, or required code-review rejection — no exceptions without amending this document. **SHOULD** = strong default; deviation is permitted only with a documented reason in code review. **MAY** = explicitly optional, left to implementer judgment.

---

## 0. Guiding Principles

Use these to resolve any case not covered by an explicit rule below. They clarify intent; they do not override an explicit MUST/NEVER rule elsewhere in this document.

- **Single Responsibility**: one module, one reason to change.
- **DRY**: extract shared logic once genuinely duplicated; never duplicate a business rule across layers (see §1.3).
- **KISS**: prefer the simplest implementation that satisfies the requirement.
- **YAGNI**: do not add abstraction, configuration, or generality for requirements that do not yet exist.
- **Composition over inheritance**: compose behavior via functions, hooks, or higher-order components; do not use class inheritance to share logic.

### 0.1 Simplicity & Abstractions
- Prefer explicit, straightforward solutions over clever or generalized ones.
- Do NOT introduce factories, registries, strategy layers, generic helpers, or additional architectural layers unless a concrete, demonstrated need exists.
- Optimize for maintainability and readability over theoretical flexibility.
- Do NOT design for hypothetical future requirements; solve the requirement in front of you.

---

## 1. System Layers & Boundary Flow

**Mandatory flow (no layer skipping, no reverse calls):**
`UI Layer (Components / Hooks) -> RTK Query API (createApi endpoints) | RTK Slices (createSlice, for client-only state) -> Store -> UI Layer`

Server state (anything that originates from an external system — HTTP/REST, GraphQL, WebSockets, storage, filesystem, native APIs, CLI, hardware, platform channels e.g. Electron IPC) flows exclusively through an RTK Query `createApi` instance, which owns fetching, caching, revalidation, and normalized async status. Client-only state (UI toggles, form drafts, active filters, wizard/session state, anything with no server-side source of truth) flows exclusively through `createSlice` reducers. Both register into the same Store; the UI never has to know which mechanism backs a given piece of state beyond calling the hook or selector it was given.

State that has no single owning domain — which top-level view is active, whether an app-wide action (e.g. an export) is in progress — is still state that needs a home, not an exception to this flow. Model it as its own feature (e.g. `features/navigation/`, `features/export/`) with its own `createSlice`, exactly like any other domain; see §2.1 for why nothing may sit as a loose slice or component directly under `src/`.

### 1.1 Layer Contracts

| Layer | Responsibility | Rule |
|---|---|---|
| **UI Layer** (`components/`, hooks) | Render view, capture user intent, consume auto-generated RTK Query hooks, dispatch slice actions | NEVER performs raw I/O directly; NEVER calls `fetch`/`axios`/native/CLI/hardware APIs inline |
| **RTK Query API** (`createApi`) | Sole owner of all external I/O — HTTP/REST, GraphQL, WebSockets, browser storage, filesystem, native APIs, CLI processes, hardware, or platform-specific channels (e.g. Electron IPC); encapsulates caching, revalidation, cache-tag invalidation, and normalized `status`/`isLoading`/`isFetching`/`error` | MUST NOT contain JSX or presentation logic; non-HTTP I/O MUST go through a custom `baseQuery`/`queryFn`, never bypass `createApi` |
| **RTK Slices** (`createSlice`) | Single source of truth for client-only state; pure state transitions, plus `extraReducers`/`matchers` reacting to RTK Query lifecycle actions when a slice needs to mirror them | MUST be pure; MUST NOT execute async code, perform I/O, or call an API layer directly |
| **Store** | Combines RTK Query cache reducer(s) and slice reducers into one source of truth; wires `api.middleware` and any `listenerMiddleware` | Sole place reducers/middleware are assembled; MUST NOT contain business logic |
| **Pure Helpers** (feature `utils`) | Side-effect-free data transformation | MUST NOT import Redux, `createApi` instances, or I/O modules |

### 1.2 Non-Negotiable Boundary Rules
- Components MUST consume auto-generated RTK Query hooks (`useGet...Query`, `use...Mutation`, etc.) for server state/I/O, or dispatch slice actions/thunks for client-only state — NEVER call a raw `fetch`/`axios`/native/CLI/hardware function inline.
- Components and hooks MUST NOT perform inline async I/O side-effects inside `useEffect` (e.g. manually fetching and `setState`-ing). If data is needed on mount, express it as an RTK Query endpoint call, not a `useEffect` fetch.
- Only an RTK Query `createApi` instance (or, for non-HTTP I/O, a dedicated service module wrapped by a custom `baseQuery`/`queryFn`) MAY perform raw I/O — network requests (HTTP/GraphQL/WebSocket), browser storage, filesystem, native APIs, CLI processes, hardware access, or platform-specific channels (e.g. Electron IPC).
- Slices MUST NOT call an API layer, dispatch further actions from within a reducer, or perform async work; a slice may only react to RTK Query lifecycle actions via `extraReducers`/`builder.addMatcher`.
- State is the single source of truth: no component-local cache of data that also lives in the RTK Query cache or a slice, no module-level singletons holding app state.

### 1.3 Business Rule Ownership
- Every business rule MUST have exactly one owner module.
- The same business rule MUST NOT be duplicated across `components/`, hooks, selectors, `createApi` endpoints, and slices.
- If more than one layer needs the same rule, extract it into a single shared function in the layer that owns it and have the others call it — NEVER re-implement it.

---

## 2. Directory Responsibilities & Import Boundaries

### 2.1 Standard Layout

**Feature-First is the primary organizational convention.** All related domain logic — RTK Query endpoints, slices, UI components, selectors, and pure feature utils — MUST be co-located within its owning feature folder rather than scattered across global layer-first directories (`actions/`, `services/`, `reducers/`). This includes state or composition that has no single natural owner — top-level navigation (which view/tab is active), or a component that composes several other features' data (e.g. a shared export action) — model these as their own feature (`features/navigation/`, `features/export/`, etc.) rather than as loose files at `src/` root. Nothing lives directly under `src/` outside the tree below except build/bootstrap files (`store.ts`, `index.tsx`, and the root composition component, e.g. `App.tsx`).

```
src/
  features/
    <domain>/
      <domain>Api.ts      # createApi endpoints for this domain (or api/ subfolder) — public
      <domain>Slice.ts    # createSlice for this domain's client-only state — public
      <domain>.types.ts   # (optional) feature-local DTOs, request/response shapes, and view models — public
      utils.ts             # pure, synchronous feature-local helpers — public
      components/         # feature-owned UI (presentational + container) — private
      __tests__/           # this feature's tests, colocated — private
  shared/                 # or common/ — see restriction below
    api/
      baseApi.ts           # shared fetchBaseQuery config / injectEndpoints base
    components/            # genuinely reusable UI primitives (Button, Dialog, Table, Toast)
    utils/                 # application-wide pure utility functions
  types/                  # shared, domain-agnostic interfaces (e.g. PaginationParams, ApiResponse<T>)
  store.ts
  index.tsx
```

There is no mandated subfolder naming inside a feature — a small feature MAY keep everything in flat files (`<domain>Api.ts`, `<domain>Slice.ts`, `<domain>.tsx`); a large one MAY split `components/`, `hooks/`, etc. internally. Types follow the same flexibility, governed by one rule: a type stays declared where it's used until a second file needs to import it, at which point it MUST move to a feature-local `<domain>.types.ts` (or `types.ts`). Two categories are exempt from that count and always stay local no matter how many places render them: component prop types (`interface FooProps`) always live in their own component's file, and a slice's own state shape (`<Domain>State`) always lives in `<domain>Slice.ts` and MUST NOT be exported — external code reads it only through the slice's colocated selectors. Either way, types stay completely colocated with the feature, never promoted to `src/types/` merely for convenience. What is fixed is the boundary: a feature folder owns its endpoints, its slice, its UI, its types, and its utils, and nothing about a domain's logic lives outside that folder except through the feature's public surface.

A feature's public surface is determined by file location, not by a hand-maintained barrel file: any file sitting directly under `features/<domain>/` (no further nesting) is public and importable by other features; anything nested one level deeper or more (`components/`, `__tests__/`, or any other subfolder) is private and MUST NOT be imported from outside the feature. Do NOT add an `index.ts` re-export barrel to bridge this — a hand-maintained export list drifts from what's actually consumed (over-exporting internals nobody needs, under-pruning exports nobody uses anymore) and adds an indirection layer with no enforcement value the file-location rule doesn't already give for free. Enforce the boundary structurally instead (e.g. `eslint-plugin-boundaries` matching element type by path depth). Pair this with a project-wide unused-export/unused-file detector (e.g. `knip`, see §5.4) — the location rule stops other features from reaching in, but only a dead-code tool catches a public file that nothing, anywhere, actually still imports.

Selectors MUST NOT live in a standalone `selectors.ts` file. Client-state selectors MUST be colocated inside `<domain>Slice.ts` (exported alongside the slice's reducers/actions); server-state "selection" is handled automatically by the RTK Query generated hooks (`data`, or a hook-local `selectFromResult` for derived/memoized shaping) rather than a hand-written selector module.

`src/shared/` (or `src/common/`) is restricted strictly to: genuinely reusable UI primitives with no domain knowledge, the global base query configuration (e.g. the shared `fetchBaseQuery` setup that per-feature APIs inject endpoints into via `injectEndpoints`), and application-wide pure utility functions. `shared/` MUST NOT contain domain/business logic, and MUST NOT import from `features/`.

Domain-specific types/DTOs (endpoint request/response shapes, slice state shapes, feature-local view models) MUST be colocated inside their owning feature folder — defined directly in `<domain>Api.ts`/`<domain>Slice.ts`, or in a feature-local `types.ts` when shared across several files within that feature. `src/types/` MUST be reserved strictly for application-wide, domain-agnostic interfaces used across multiple features (e.g. `PaginationParams`, a generic API envelope, or ambient/global declarations) — it MUST NOT accumulate a feature's domain types just because it feels like a convenient shared location.

Modular/multi-package workspaces MAY split any feature into a separate internal package, but the layer contract and import direction below MUST still hold across package boundaries.

### 2.2 Per-Directory Contract

| Dir | MAY | MUST NOT |
|---|---|---|
| `features/<domain>/components/` | call this feature's generated RTK Query hooks; dispatch this feature's slice actions; read state via this feature's selectors | call `fetch`/`axios`/native/CLI/hardware APIs directly; perform inline async I/O in `useEffect`; contain business logic; mutate state; reach into another feature's internals outside its public surface; be imported from outside this feature (private per §2.1) |
| `features/<domain>/<domain>Api.ts` (`createApi`) | be the sole caller of network APIs, browser storage, `fs`, `child_process`, native/IPC APIs, hardware/CLI tools for this domain (directly or via a custom `baseQuery`/`queryFn`); dispatch this feature's own slice actions from `onQueryStarted` for cache-adjacent side effects; be imported directly by other features (it's public per §2.1) | contain JSX or presentation logic; contain unrelated business-workflow logic |
| `features/<domain>/<domain>Slice.ts` (`createSlice`) | pure `(state, action) => state`; export colocated selectors (`select<Thing>`) for this domain's client state; react to this domain's or another domain's RTK Query lifecycle actions via `extraReducers`/matchers; import types from `<domain>Api.ts` | execute async code; call an API layer; import component modules; read another domain's slice state directly; be split into a standalone `selectors.ts` file |
| `features/<domain>/utils.ts` | pure sync transforms (parse/format/math) local to the feature | perform I/O; import Redux; import `createApi` instances; import `fs`/`child_process`; be `async` |
| `shared/api/baseApi.ts` | define the shared `fetchBaseQuery`/base `createApi` that features inject endpoints into | contain feature-specific endpoints or business logic |
| `shared/components/` | expose reusable, domain-agnostic UI primitives | import from `features/`; contain business logic |
| `shared/utils/` | pure, domain-agnostic sync transforms | perform I/O; import Redux; import from `features/` |
| `types/` | application-wide, domain-agnostic interfaces/types used across multiple features (e.g. `PaginationParams`, generic API envelopes, ambient declarations) | contain logic; contain a single feature's domain-specific types/DTOs |

### 2.3 Import Rule Table (enforce via lint: `import/no-restricted-paths`)

| From | To | Allowed? |
|---|---|---|
| `features/<domain>/components/` | own feature's generated RTK Query hooks | YES |
| `features/<domain>/components/` | own feature's slice actions (dispatch) | YES |
| `features/<domain>/components/` | own feature's slice-colocated selectors | YES |
| `features/<domain>/components/` | raw `fetch`/`axios`/native/I/O calls | **NO** |
| `features/<domain>/components/` | another feature's internals (non-public files) | **NO** |
| `features/<domain>/components/` | another feature's public (flat, root-level) files | YES (sparingly; prefer composition at route/page level) |
| `<domain>Api.ts` | `shared/api/baseApi.ts` (`injectEndpoints`) | YES |
| `<domain>Api.ts` | own feature's slice (dispatch via `onQueryStarted` only) | YES |
| `<domain>Api.ts` | components | **NO** |
| `<domain>Slice.ts` | `<domain>Api.ts` types / lifecycle action matchers | YES (types/matchers only) |
| `<domain>Slice.ts` | components | **NO** |
| `features/<domain>/utils.ts` | Redux / `createApi` / `fetch` / `fs` / `child_process` | **NO** |
| `shared/` | `features/` | **NO** |

---

## 3. State Management & Async Standards

### 3.1 API & Slice Splitting
- Split RTK Query endpoints and slices by **logical domain**: e.g. `device`, `file`, `process`, `settings`, `ui`, `warning`.
- NEVER split by screen.
- A feature's `createApi` instance owns: its endpoint definitions, their cache tags, and their `transformResponse`/error shaping.
- Cache tags (`providesTags`/`invalidatesTags`) are REQUIRED once an endpoint's data needs invalidating — by a mutation, or by a manual refresh/refetch-all control exposed to the user. An endpoint with only external, read-only data and neither of those MAY omit tags; the moment either appears, introduce tags rather than hand-rolling per-hook `refetch()` calls scattered across components.
- A feature's slice owns: its state shape, its action types/reducers, its own colocated selectors (`select<Thing>`).
- Cross-domain composition happens in a memoized selector, a `selectFromResult` in a hook wrapper, or a `listenerMiddleware` — NEVER by one slice importing another's state shape, and NEVER by one `createApi` instance reaching into another's endpoints.

### 3.2 Async Lifecycle
- For any standard server-state operation (HTTP/REST/GraphQL CRUD), the async lifecycle (`uninitialized -> pending -> fulfilled | rejected`) MUST be expressed through an RTK Query endpoint and consumed via its generated hook's `data`, `isLoading`, `isFetching`, `isSuccess`, `isError`, and `error` fields. Do NOT hand-roll a parallel discriminated status union for something an RTK Query hook already exposes.
- Non-standard I/O — hardware, WebSockets, streaming, or Electron IPC — MUST be modeled as an RTK Query endpoint using a custom `queryFn` (single request/response) or `onCacheEntryAdded` (long-lived subscription/stream), OR as a dedicated `listenerMiddleware` / `createAsyncThunk` living inside the owning feature module when it does not fit the query/mutation shape at all.
- When a hand-rolled thunk is used for non-standard I/O, it MUST still follow an explicit `pending -> fulfilled | rejected` lifecycle modeled with a discriminated status union, e.g. `status: 'idle' | 'pending' | 'success' | 'error'` — NOT `isLoading` + `isSuccess` + `hasError` booleans.
- Multi-step workflows: dispatch/track ONE workflow-started state (single coherent busy state), roll up progress into a typed payload (`{ step, percent }`), never raw stdout/unparsed output to UI.
- Multi-step workflows MUST be cancellable: check a cancellation token/flag between every `await`, or use `AbortController`/RTK Query's built-in abort-on-unmount.

### 3.3 Stale Response / Race Guards
- RTK Query endpoints get request deduplication, cache-key-based staleness, and abort-on-unmount for free — do NOT hand-roll a `requestId`/abort guard around a standard query hook.
- Any hand-rolled thunk or custom `queryFn` that is re-triggerable (refresh, re-fetch, re-parse) MUST still guard against applying a stale result:
  - Track a `requestId` in state; on receive, compare to latest; discard if stale. OR
  - Use `AbortController` end-to-end; cancel prior in-flight call when a new one starts.
- NEVER fire-and-forget a promise in an event handler without the caller awaiting/catching/dispatching its result.

### 3.4 Teardown
- RTK Query query hooks unsubscribe automatically on unmount; no manual cleanup is required for standard `useGet...Query` usage.
- Any subscription opened in `onCacheEntryAdded` (WebSocket, IPC listener, file watcher) MUST be torn down in that same handler's `cacheEntryRemoved` branch — not left to garbage collection.
- Any subscription (event stream, file watcher, interval, IPC listener) started in a `listenerMiddleware` effect or `useEffect` outside RTK Query MUST be torn down:
  - React: return cleanup fn from `useEffect`.
  - `listenerMiddleware`/thunks: expose explicit `unsubscribe`/`close`; call on disconnect, app-exit, and cancellation — not only the happy path.

### 3.5 Error Normalization & Propagation
*(Not to be confused with React Error Boundaries — see §3.6.)*
- Error normalization MUST be centralized in a custom `baseQuery` wrapper (or a global RTK Query error-transforming middleware) that converts any transport-level failure (HTTP status, network failure, native/IPC error) into a **typed** error shape (discriminated union or stable `code`) — NEVER a bare string parsed from stdout or a raw `error.message` surfaced to state.
- The app owns exactly ONE shared `describeError(error: unknown): string` (or mapping table) that converts any normalized RTK Query/domain error into user-facing text — used across all domains rather than reimplemented per domain. Domain-specific cases MAY be added as extra branches inside that single mapper; do NOT fork a second, parallel error-formatter. NO ad hoc `catch (e) { setMessage(e.message) }` in components — read `error` off the hook and pass it through `describeError`.
- State shape (slice fields that mirror errors, or endpoint `error` typing) MUST distinguish transient vs. terminal errors so UI can decide retry vs. block.
- Every RTK Query rejection that a slice mirrors via `extraReducers`, and every hand-rolled thunk failure, MUST be logged with operation name, relevant id, timestamp.
- NEVER leak an error as an unhandled rejection or unparsed stdout to the UI. NEVER swallow an error silently — an operation failing without a state update is an infinite hang to the user.

### 3.6 React Error Boundaries (Render-Time Failures)
- The application MUST be wrapped in a single React error boundary near the app root, so render/lifecycle crashes anywhere in the tree are contained instead of blanking the whole app. Additional per-feature boundaries MAY be added around a specific high-risk view (e.g. a heavy visualization) but are not required by default — one root-level boundary is the standard, not an exception.
- Error boundary fallback UI MUST be static (no further RTK Query calls or slice dispatches) and MUST offer a recovery action (e.g. reload feature/route).
- Error boundaries handle render-time exceptions only; they MUST NOT be used as a substitute for the async error handling in §3.5.

### 3.7 Collection State Normalization
- RTK Query already normalizes cache entries per endpoint/cache-tag; do NOT additionally copy the same entity into a slice "just in case" — read it from the endpoint's cache via the generated hook or `selectFromResult`.
- Where a slice does need to hold a collection of entities (e.g. client-only drafts, a locally-reordered list), it SHOULD be normalized rather than nested/duplicated, so a given entity exists in exactly one place in the store.
- Avoid duplicated entity storage: the same entity MUST NOT be copied into multiple slices or nested inside multiple parent records.
- Prefer O(1) entity lookup (e.g. a keyed map) over linear scans where practical.
- Redux Toolkit's `createEntityAdapter` is the recommended implementation of this rule, usable both inside a slice's client-only state and inside an RTK Query endpoint's `transformResponse` to normalize server data, but is not required — any normalized shape achieving the same properties is acceptable.

---

## 4. UI Layer Rules

### 4.1 Component Classification

| Type | Reads state / dispatches? | Contract |
|---|---|---|
| Presentational | NO | accepts only primitives/plain objects/callback props; no `dispatch`, no RTK Query hooks, no store access |
| Container | YES | calls generated RTK Query hooks and/or dispatches slice actions, composes presentational children; JSX kept minimal (extract children if container JSX > ~30 lines) |

- Business logic (what a mutation does, how a workflow proceeds) lives in the feature's `createApi` endpoint definitions and slice reducers. A container decides only *when* to call a hook or dispatch an action, never *how* the underlying operation works.
- A container's responsibilities MAY instead be implemented as a custom hook consumed by a component (see §4.4). Hooks supplement this classification; they do not replace it.

### 4.2 Heavy/Complex Views (data grids, maps, tables, real-time telemetry, large logs)
- Derive, don't store: any value computable from existing state (merges, formatting, aggregation) MUST be a memoized selector (e.g. `reselect`, or an RTK Query `selectFromResult`) or pure feature `utils` fn — NEVER duplicated into its own slice state.
- Virtualize any list/grid that can exceed a few hundred rows. Hand-rolled pagination as a substitute is FORBIDDEN.
- Streaming/real-time data (via `onCacheEntryAdded` or a `listenerMiddleware`) MUST be buffered/batched before it is written into the cache/state (bounded rate, e.g. max ~60 updates/sec). One state update per incoming sample/byte is FORBIDDEN.
- Visualization components MUST be pure functions of `(data, selection) => JSX` — snapshot-testable without live I/O.

### 4.3 Accessibility & Consistency
- Every icon-only control MUST have an accessible label.
- Async busy state MUST be exposed via `aria-busy`/disabled driven by the hook's `isLoading`/`isFetching`, not visual spinner alone.
- State (connected/error/busy) MUST NOT be signaled by color alone — pair with text/icon/shape.
- Common UI primitives (buttons, dialogs, tables, toasts) MUST live in `shared/components/` to avoid duplicated, inconsistent implementations across features.

### 4.4 Custom Hooks
- Custom hooks encapsulate reusable UI-facing behavior (composing generated RTK Query hooks, dispatching slice actions, subscriptions) behind a `use<Thing>()` function.
- Hooks MUST NOT perform infrastructure calls directly (`fetch`, `axios`, filesystem, native, CLI, hardware) — they MUST delegate to generated RTK Query hooks or dispatch slice actions.
- Hooks MUST delegate business workflows to `createApi` endpoints/slices; a hook orchestrates *when* to call them (e.g. composing a query with a derived selector, or sequencing a mutation), not the workflow logic itself.
- Hooks MUST NOT contain rendering (no JSX return).
- Hooks SHOULD remain small, composable, and focused on one concern; compose multiple hooks (including multiple generated RTK Query hooks) rather than growing one hook to cover several concerns.
- Hooks are an alternative to, not a replacement for, the container pattern (§4.1): a component uses either a container wrapper or a custom hook to reach the state layer for a given concern, never both at once for the same concern.
- If two or more components independently call the same combination of RTK Query hooks and apply the same derivation or gating logic around them (e.g. "wait for these three queries, then compute X"), extract that combination into one shared hook owned by the feature. This is not covered by §1.3, which only guards the underlying pure business-rule functions — the orchestration glue around them can still end up duplicated even when no business rule technically is.

### 4.5 Memoization Philosophy
- Memoization (`useMemo`, `useCallback`, `React.memo`, `reselect`, RTK Query's `selectFromResult`) is a performance optimization, not a default.
- Do NOT apply `useMemo`/`useCallback`/`React.memo`/`selectFromResult` without a measured or clearly predictable performance benefit (e.g. large list re-render, expensive computation, avoiding re-renders on unrelated cache field changes).
- Correctness and readability take precedence over premature optimization; unmeasured memoization that adds complexity without benefit MUST be removed in review.

### 4.6 Styling
- Web projects SHOULD use Tailwind CSS as the default styling mechanism. A project built primarily on a themed component library that already owns its own design tokens (e.g. Radix Themes, MUI) MAY deviate — document the decision where the styling approach is set up.
- All design tokens (color palette, spacing scale, breakpoints, font sizes) MUST be defined once, centrally — in the Tailwind config (`tailwind.config.js` `theme.extend`) when Tailwind is used, or in the component library's own theme setup when it isn't. Projects that deviate to a themed component library still MUST NOT hand-copy repeated style combinations across files (e.g. the same inline `style={{ border: ..., borderRadius: ... }}` in five components) — extract them into a shared constant or wrapper component; §5.5's ban on duplicated literals applies here too, a component library's tokens don't exempt you from it.
- The application MUST be responsive across desktop, tablet, and mobile viewport widths, mobile-first (Tailwind's `sm:`/`md:`/`lg:`/`xl:` breakpoints or equivalent). A layout verified only at one viewport size is not considered complete.

---

## 5. Engineering & Code Standards

### 5.1 TypeScript
- `any` is BANNED (`@typescript-eslint/no-explicit-any` = error). Use `unknown` at trust boundaries + explicit narrowing.
- `strict: true` mandatory in `tsconfig.json` (this implies `strictNullChecks`). No opt-out. `noUncheckedIndexedAccess` is a SHOULD, not a hard requirement.
- Discriminated unions REQUIRED over multiple boolean flags for any state with >2 meaningful values.
- Every `switch` over a union/enum MUST end with `default: assertUnreachable(value)`.
- Export only a module's public contract; keep internal helper types unexported. A feature's public surface is every file directly under its `features/<domain>/` root (see §2.1) — there is no `index.ts` barrel.

Naming:

| Kind | Convention | Example |
|---|---|---|
| Interface/Type | `PascalCase`, no `I` prefix | `DeviceInfo` |
| Slice state | `<Domain>State` | `DeviceState` |
| `createApi` instance | `<domain>Api` | `deviceApi` |
| Endpoint / generated hook | `use<Verb><Noun>Query` / `use<Verb><Noun>Mutation` | `useGetDeviceStatusQuery`, `useConnectDeviceMutation` |
| Slice action creators | `verbNoun` camelCase | `setActiveFilter` |
| Components | `PascalCase`, 1/file, matches filename | `DeviceSelector.tsx` |
| Selectors | `select<Thing>` | `selectIsDeviceReady` |
| Feature util functions | `verbNoun` camelCase | `mergeMemoryRegions` |

### 5.2 Feature `utils` Purity Contract (all mandatory)
1. Pure — same input -> same output.
2. Synchronous — no `Promise`/`async`/I/O callbacks.
3. Side-effect-free — no `fs`, `console`, `Date.now()`/`Math.random()` unless injected as params; no argument mutation.
4. No Redux / `createApi` / native API imports.
5. 100% unit test coverage including boundary/malformed input.
- Non-deterministic inputs (time, random, file reads) MUST be passed in as parameters by the caller (a component, hook, or endpoint's `transformResponse`), never accessed ambiently inside a `utils` module.

### 5.3 Testing Boundary
- Test files live in a colocated `__tests__/` folder inside the feature (`features/<domain>/__tests__/`) or the relevant `shared/` subfolder (`shared/<area>/__tests__/`) — never as a same-directory `Foo.test.ts` sibling, and never in one repo-wide top-level `tests/` folder.
- Mock ONLY at the transport boundary: inject a mock `baseQuery`/`fetchBaseQuery` implementation (or use a request-mocking layer such as MSW) at the `createApi` instance under test.
- NEVER mock `fs`, process runners, or Redux internals directly in component or hook tests.

| Layer | Test type | Mocks |
|---|---|---|
| feature `utils` | unit, 100% coverage | none |
| `<domain>Slice.ts` | unit `(state, action) => state`, including `extraReducers` matchers on RTK Query lifecycle actions | none |
| `<domain>Api.ts` endpoints | integration against a mocked `baseQuery`/transport (e.g. MSW) | transport layer only |
| `components/` presentational | render + interaction | none (props only) |
| `components/` container | render vs. seeded `Provider` store with RTK Query cache pre-populated or mocked | transport layer (via mocked `baseQuery`) |
| custom hooks | render-hook tests vs. seeded `Provider` store | transport layer only |

- Every bug fix in a slice, endpoint, or feature `utils` MUST ship a regression test that fails pre-fix.
- Critical user workflows SHOULD have end-to-end tests validating the full workflow through real UI interaction, not just unit/integration coverage of individual layers.

### 5.4 Build & Quality Gates
- Lint, type-check, test are BLOCKING in CI. No merge with new lint errors, `tsc` errors, or failing tests.
- License/dependency checks run as part of the standard `check` pipeline.
- Use `import type` for type-only imports to avoid runtime bundle inflation.
- `--no-verify` and disabling a failing check to unblock a merge are FORBIDDEN. Fix the check in its own reviewed change instead.
- A project-wide unused-code detector (e.g. `knip`) runs as part of the standard `check`/CI pipeline, covering unused exports, files, and dependencies — complements the import-boundary lint (§2.3), which catches wrong-direction imports but not exports nobody consumes anymore.

### 5.5 Configuration & Constants
- Environment-specific values (URLs, keys, feature flags) MUST be read from a dedicated configuration module — NEVER inline environment reads scattered across `createApi` endpoint definitions, slices, or components. `shared/api/baseApi.ts` is the one place `fetchBaseQuery`'s `baseUrl`/headers are assembled from that configuration module.
- The configuration module MUST fail fast — throw a clear error at startup if a required environment variable is missing, rather than silently continuing with `undefined`.
- `.env` files holding real secrets or environment-specific values MUST NOT be committed: only a `.env.example` template with placeholder values is checked in, and `.gitignore` MUST exclude `.env`/`.env.local`. The only exception is when every value in the file is genuinely non-secret (e.g. a public API base URL) — state that explicitly next to the values if so.
- In Vite (or any bundler that inlines env vars into the client bundle), NEVER give a real secret a client-exposed prefix (e.g. `VITE_`) — such values ship inside the built JS and are readable by anyone; that prefix is for genuinely public values only.
- Magic numbers and duplicated string literals are FORBIDDEN; give them a named constant.
- Shared constants MUST live in a dedicated constants module (or a colocated per-feature constants file), not redefined per file.

### 5.6 Comment Philosophy
- Code explains WHAT it does; comments explain WHY, only when the reason is non-obvious (a constraint, a workaround, an invariant).
- Do NOT comment obvious code.
- Prefer expressive naming and structure over explanatory comments — if a comment is needed to explain what code does, rewrite the code first.

### 5.7 File & Function Size
- Large files SHOULD be split by responsibility once they mix unrelated concerns.
- Large components SHOULD be decomposed into smaller presentational/container pieces or hooks.
- Functions SHOULD operate at a single level of abstraction — do not mix high-level orchestration and low-level detail in the same function.
- Prefer small, focused functions over long procedural blocks. No fixed line-count limit is mandated; split when responsibility, not length, demands it.

### 5.8 Early Returns
- Prefer guard clauses and early returns over deeply nested conditionals.
- Invert conditions to exit early on invalid/edge cases before the main logic path.

---

## 6. Checklists

### New Feature / Module
- [ ] Zero direct network, `fs`/`child_process`, native/hardware, or raw `fetch`/`axios` calls outside the feature's `createApi` instance.
- [ ] RTK Query endpoints and slices are domain-driven (§3.1), not screen-driven.
- [ ] Standard server-state operations rely on generated hook status fields (`data`/`isLoading`/`isFetching`/`error`); non-standard I/O follows `queryFn`/`onCacheEntryAdded`/`listenerMiddleware` per §3.2.
- [ ] Feature `utils` fully pure + 100% tested (§5.2).
- [ ] No component bypasses generated hooks/slice actions to call I/O directly.
- [ ] No business rule is duplicated across components/hooks/selectors/`createApi` endpoints/slices (§1.3).
- [ ] All feature-owned files live under `features/<domain>/`; nothing domain-specific leaked into `shared/`.

### New `createApi` Endpoint
- [ ] Public surface is a typed query/mutation with a generated hook; no raw stdout/JSON leak.
- [ ] Errors flow through the shared `baseQuery` error normalization (§3.5), not bare strings.
- [ ] Endpoint has no reference to specific slices (beyond `onQueryStarted` side effects) or components.
- [ ] Cache tags (`providesTags`/`invalidatesTags`) are set so dependent data revalidates correctly — or, if omitted, the endpoint has no mutations and no manual refresh/invalidate control (state which, in review).
- [ ] Ships with a mock-transport test double (e.g. MSW) for I/O-free unit testing.

### Code Review Red Flags (auto-reject)
- [ ] Component calls `fetch`/`axios`/a native/CLI/hardware function directly instead of a generated RTK Query hook.
- [ ] Component performs data fetching inline inside `useEffect` instead of via an RTK Query endpoint.
- [ ] Feature `utils` function is `async`, imports `fs`, or calls `dispatch`.
- [ ] A slice reducer calls an API layer or performs `await`.
- [ ] Error caught and only `console.log`'d with no state update.
- [ ] I/O promise started without await/catch/dispatch of its result.
- [ ] A custom hook calls `fetch`/native/I/O directly instead of delegating through a generated RTK Query hook or slice dispatch (§4.4).
- [ ] The same business rule is implemented in more than one layer (§1.3).
- [ ] Domain-specific logic placed in `shared/`, or `shared/` importing from `features/`.

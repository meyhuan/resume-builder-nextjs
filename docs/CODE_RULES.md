# Frontend Code Rules

Conventions for this codebase, derived from concrete bugs we've fixed.
Every rule has a **why** — never follow a rule blindly.

---

## 1. Data fetching

### Rule 1.1 — Prefer Server Components for initial data

For any page that needs data on first paint, load it in a Server Component
(`page.tsx`) via Prisma/DB calls and pass it to the Client Component as a
prop. **Do not** `useEffect(() => fetch(...))` for initial data.

**Why:** client-side fetch inside `useEffect` introduces loading flicker,
race conditions, and cleanup/cancellation complexity. Worse, if any effect
dep depends (even transitively) on store state that the fetch itself
mutates, you get cleanup-mid-flight → silent failures.

**Case study:** `/m/edit` used to fetch the resume client-side. A derived
boolean (`hasCachedDraft`) in the effect deps re-evaluated after
`setFromServer` mutated the zustand store; React tore down the effect
(setting `cancelled=true`) before the pending fetch resolved, so
`setLoadState('ready')` never ran. The page hung on "loading…" forever.
Fix: move the query to `page.tsx`, remove the effect entirely.

### Rule 1.2 — Client fetch is fine for *mutations* and *polling*

`POST`/`PUT`/`DELETE` actions, user-triggered refreshes, and periodic
polling belong on the client. Keep them in event handlers or
clearly-scoped effects, not intermixed with initial-data effects.

### Rule 1.3 — Never silence errors with an empty `catch {}`

Every `catch` block must either `log.error(...)` or surface a user-visible
error. Silent catches make real problems invisible.

---

## 2. `useEffect` discipline

### Rule 2.1 — Derived values must NOT live in the deps array

If a value is computed from store/props inside the component body, it is
not a dependency; it is a projection of deps that already exist. Put the
true primitive deps (ids, strings) in the array.

```ts
// BAD — hasCachedDraft changes whenever store.draft changes
const hasCachedDraft = Boolean(draft && resumeId)
useEffect(() => { ... }, [paramId, hasCachedDraft])

// GOOD — effect only re-runs when the real input changes
useEffect(() => { ... }, [paramId])
```

### Rule 2.2 — No `cancelled` flag for initial load

If you find yourself writing `let cancelled = false; return () => { cancelled = true }`
around an initial fetch, stop. Either:
- Move data loading to the Server Component (Rule 1.1), or
- Use a proven library (SWR / React Query / `use()` + Suspense).

`cancelled` flags are acceptable **only** for interval-based polling or
user-triggered async flows where out-of-order results are a real concern.

### Rule 2.3 — One effect, one concern

Don't bundle `fetch + subscribe + cleanup + setState` into a single
effect. Split them so each effect's dep array is minimal and obvious.

---

## 3. TypeScript

### Rule 3.1 — No `any`, no `@ts-ignore`

Use `unknown` + a narrow guard, or declare a proper local interface.
ESLint enforces this — don't work around it.

### Rule 3.2 — Every function has an explicit return type

Helps readers and catches return-type regressions when refactors slip.

### Rule 3.3 — Prefer `readonly` props

`interface Props { readonly id: string }` — immutable by default.

---

## 4. Logging

### Rule 4.1 — Use `createLogger(scope)`

```ts
import { createLogger } from '@/lib/logger'
const log = createLogger('m/edit')

log.info('page enter', { id })
log.warn('fallback used', { reason })
log.error('save failed', err)
```

- `debug` / `info` are stripped in production.
- `warn` / `error` always emit.
- Prefixed with scope so you can grep `[m/edit]` end-to-end.

### Rule 4.2 — Log at every non-trivial branch during development

At minimum:
- Entry/exit of async flows
- Every network call (request issued, response status, parse result)
- Error catch blocks (with stack/message)

### Rule 4.3 — Do not leave ad-hoc `console.log` behind

Replace with `log.debug(...)` so it's stripped in prod automatically.

---

## 5. Mobile (`/m/*`) specific

### Rule 5.1 — vConsole is mounted globally

`@/src/app/m/layout.tsx` includes `<MobileDebugTools />`. Activation:
- Dev builds: **always on**.
- Prod builds: visit any `/m/*` URL with `?debug=1` once; the flag is
  persisted in localStorage. Clear with
  `localStorage.removeItem('mobile_debug')`.

Never add per-page vConsole snippets; use the global one.

### Rule 5.2 — Never rely on `request.url` for absolute redirects

Behind Nginx, `request.url` can be `http://localhost:3000/...` even for
public traffic. For any `NextResponse.redirect` or URL construction,
read `x-forwarded-host` / `x-forwarded-proto` headers.

### Rule 5.3 — Cookie `sameSite`

- Same-site fetch (our case): `sameSite: 'lax'` is enough and maximally
  compatible with WeChat web-view WebKit.
- Cross-site: `sameSite: 'none'` **plus** `secure: true`, but know that
  some embedded WebKits drop these cookies entirely.

---

## 6. File & module layout

### Rule 6.1 — One export per file

Matches the user-wide preference; keeps blast radius small.

### Rule 6.2 — kebab-case filenames, PascalCase components

`edit-home-client.tsx` exports `MobileEditHomeClient`.

### Rule 6.3 — Functions under 50 lines

Extract helpers. Deeply nested conditionals → early returns.

---

## 7. Code review checklist (PR template)

- [ ] Initial data loaded via Server Component, not `useEffect + fetch`.
- [ ] No `cancelled` flag in effects (unless polling).
- [ ] No `any`, no `@ts-ignore`, no empty `catch`.
- [ ] New async flows use `createLogger` for entry/exit/error.
- [ ] Redirects don't rely on `request.url`.
- [ ] All effects' dep arrays contain only primitive inputs.

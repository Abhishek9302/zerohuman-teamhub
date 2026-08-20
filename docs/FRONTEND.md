# Sniplet — Frontend Reference

The Sniplet frontend is a **Next.js 14 (App Router) + TypeScript** single-page
dashboard rooted at the repository root. It talks to the backend exclusively over
HTTP using `process.env.NEXT_PUBLIC_API_URL`.

This document is the component-level companion to
[`docs/ARCHITECTURE.md`](ARCHITECTURE.md): it describes each file, its props, and
its behavior as implemented under `app/`, `components/`, and `src/`.

- **Framework:** Next.js 14 App Router, React 18, TypeScript
- **Icons:** [`lucide-react`](https://lucide.dev/)
- **Styling:** a single dark-theme stylesheet, `app/globals.css`
- **Data:** all reads/writes go through `src/lib.ts` (the only place that calls `fetch`)

---

## File map

```
app/
├─ layout.tsx      # root HTML shell + <Metadata> (title/description), imports globals.css
├─ page.tsx        # 'use client' dashboard — owns ALL state and orchestrates actions
└─ globals.css     # dark-theme design tokens and component styles
components/         # presentational, props-driven components (no data fetching)
├─ AuthPanel.tsx       # login / signup form with a mode toggle
├─ CreateLinkForm.tsx  # target-URL input → create a short link
├─ FeatureList.tsx     # static marketing/feature grid shown when logged out
├─ HeroStats.tsx       # header with aggregate totals (links, clicks, status)
├─ LinksTable.tsx      # per-link rows: short URL, destination, clicks, created, delete
└─ CopyButton.tsx      # copy a short URL to the clipboard, with a "Copied" state
src/
├─ lib.ts          # the API client: signup/login/fetchLinks/createLink/deleteLink/getShortUrl
└─ types.ts        # shared types: AuthResponse, ShortLink, ApiError
```

---

## Page shell — `app/layout.tsx`

The root layout renders the `<html>`/`<body>` shell, imports `globals.css`, and
exports Next.js `metadata` (`title: "Sniplet"`, a short description). It renders
`children` — the single route, `app/page.tsx`.

## Dashboard — `app/page.tsx`

`page.tsx` is a `'use client'` component and the **single state owner**. Every
component under `components/` is stateless and receives data + callbacks as props.

### State

| State                                   | Type                     | Purpose                                                  |
|-----------------------------------------|--------------------------|----------------------------------------------------------|
| `mode`                                  | `'login' \| 'signup'`    | Which auth form the `AuthPanel` shows (defaults `signup`).|
| `email`, `password`                     | `string`                 | Auth form inputs.                                        |
| `targetUrl`                             | `string`                 | Create-link form input.                                  |
| `token`                                 | `string`                 | The JWT. A non-empty token means "authenticated".        |
| `links`                                 | `ShortLink[]`            | The signed-in user's links (from `GET /links`).          |
| `authLoading` / `linksLoading` / `createLoading` | `boolean`       | Per-action loading flags for disabled/spinner states.    |
| `deletingId`                            | `number \| null`         | The id of the link currently being deleted.              |
| `authError` / `linkError`               | `string \| null`         | Inline error messages surfaced from the API.             |
| `statusMessage`                         | `string`                 | Human-readable status line in the status bar.            |

`totalClicks` is a `useMemo` that sums `links[].clicks` — the aggregate figure
fed to `HeroStats`.

### Session handling

- `TOKEN_KEY = 'sniplet-token'` and `EMAIL_KEY = 'sniplet-email'` are the
  `localStorage` keys.
- A mount-time `useEffect` rehydrates `token`/`email` from `localStorage`, so a
  page refresh keeps the user signed in until the token expires (7 days).
- A `useEffect` keyed on `token` calls `refreshLinks(token)` whenever the token
  changes (login, rehydrate) and clears `links` when it becomes empty (logout).
- On successful auth the token + email are written to `localStorage` and mirrored
  into React state.

### Handlers

| Handler             | Trigger                       | Behavior                                                                 |
|---------------------|-------------------------------|--------------------------------------------------------------------------|
| `handleAuthSubmit`  | `AuthPanel` submit            | Calls `login`/`signup` per `mode`, stores token+email, clears password.  |
| `handleCreateLink`  | `CreateLinkForm` submit       | Calls `createLink`, clears the input, then `refreshLinks`.               |
| `handleDeleteLink`  | `LinksTable` delete           | Calls `deleteLink(id)`, then `refreshLinks`; tracks `deletingId`.        |
| `handleLogout`      | Logout button                 | Clears the stored token, empties `links`, resets the status message.     |
| `refreshLinks`      | token change / after mutation | Fetches `GET /links`; if an error message mentions "token", auto-logs-out.|

### Layout / conditional rendering

- `HeroStats` and a **status bar** (showing `NEXT_PUBLIC_API_URL`, the session
  email, and the current state message) are always rendered.
- **Authenticated** (`token` truthy): renders `CreateLinkForm` + `LinksTable`
  and a logout button.
- **Logged out:** renders a two-column grid of `AuthPanel` + `FeatureList`.

---

## The API client — `src/lib.ts`

`src/lib.ts` is the **only** module that calls `fetch`; components never talk to
the backend directly.

- `getApiUrl()` reads `process.env.NEXT_PUBLIC_API_URL` and **throws a clear
  error** if it is unset.
- `parseResponse<T>()` parses JSON and, on a non-2xx response, throws an `Error`
  carrying the backend's `{ error }` message (falling back to `"Request failed"`).

| Function                          | Method & path         | Auth   | Returns              |
|-----------------------------------|-----------------------|--------|----------------------|
| `signup(email, password)`         | `POST /auth/signup`   | —      | `AuthResponse`       |
| `login(email, password)`          | `POST /auth/login`    | —      | `AuthResponse`       |
| `fetchLinks(token)`               | `GET /links`          | Bearer | `ShortLink[]`        |
| `createLink(targetUrl, token)`    | `POST /links`         | Bearer | `ShortLink`          |
| `deleteLink(id, token)`           | `DELETE /links/:id`   | Bearer | `{ success: true }`  |
| `getShortUrl(slug)`               | builds `${API}/r/:slug` | —    | `string`             |

`fetchLinks` uses `cache: 'no-store'` so click counts are always live. See
[`docs/API.md`](API.md) for the full request/response contract.

### Shared types — `src/types.ts`

```ts
interface AuthResponse { token: string; user: { id: number; email: string } }
interface ShortLink {
  id: number; slug: string; target_url: string;
  clicks: number; owner_id: number; created_at: string;
}
interface ApiError { error: string }
```

---

## Component reference

All components under `components/` are presentational: they render UI from props
and raise events through callback props. Interactive ones are `'use client'`.

### `AuthPanel`

Login/signup form with a segmented `Login | Sign up` toggle.

| Prop              | Type                                | Description                              |
|-------------------|-------------------------------------|------------------------------------------|
| `mode`            | `'login' \| 'signup'`               | Which form is active.                    |
| `email`           | `string`                            | Controlled email value.                  |
| `password`        | `string`                            | Controlled password value.               |
| `loading`         | `boolean`                           | Disables the submit button while working.|
| `error`           | `string \| null`                    | Inline error banner text.                |
| `onModeChange`    | `(mode) => void`                    | Switch between login/signup.             |
| `onEmailChange`   | `(value: string) => void`           | Email input change.                      |
| `onPasswordChange`| `(value: string) => void`           | Password input change.                   |
| `onSubmit`        | `() => void`                        | Submit the form (prevents default).      |

The password field enforces `minLength={6}` client-side, matching the backend's
6–72 character rule.

### `CreateLinkForm`

Single target-URL input that creates a short link.

| Prop                | Type                       | Description                               |
|---------------------|----------------------------|-------------------------------------------|
| `targetUrl`         | `string`                   | Controlled target-URL value.              |
| `loading`           | `boolean`                  | Disables submit while the request is out. |
| `error`             | `string \| null`           | Inline error banner text.                 |
| `onTargetUrlChange` | `(value: string) => void`  | Input change.                             |
| `onSubmit`          | `() => void`               | Submit (prevents default).                |

Uses `<input type="url">` for basic browser validation; the authoritative
`http`/`https` + SSRF validation happens server-side.

### `LinksTable`

Renders the user's links as a table. Shows an empty state ("No Sniplets yet")
when there are none.

| Prop         | Type                    | Description                                          |
|--------------|-------------------------|------------------------------------------------------|
| `links`      | `ShortLink[]`           | Rows to render.                                      |
| `deletingId` | `number \| null`        | The id currently being deleted (disables its button).|
| `loading`    | `boolean` (default `false`) | Toggles the refresh button spinner/label.        |
| `onDelete`   | `(id: number) => void`  | Delete a link.                                       |
| `onRefresh`  | `() => void` (optional) | Manually re-fetch links.                             |

Each row shows the short link (via `getShortUrl(slug)`, opens in a new tab) with a
`CopyButton`, the destination, a **clicks** badge with a relative bar
(`clicks / maxClicks`), a `Trophy` marker on the top performer, the created
timestamp, and a delete button.

### `CopyButton`

Copies a value to the clipboard and flips to a "Copied" state for ~1.8s.

| Prop    | Type     | Description                                      |
|---------|----------|--------------------------------------------------|
| `value` | `string` | The text to copy (the short URL).                |
| `label` | `string` (default `"Copy short link"`) | Accessible label / tooltip. |

Prefers `navigator.clipboard.writeText`, with a hidden-`textarea` +
`document.execCommand('copy')` fallback for older browsers.

### `HeroStats`

Header card with the product title and three aggregate stat cards.

| Prop            | Type      | Description                                   |
|-----------------|-----------|-----------------------------------------------|
| `totalLinks`    | `number`  | Number of links.                              |
| `totalClicks`   | `number`  | Sum of all click counts.                      |
| `authenticated` | `boolean` | Renders `Authenticated` vs `Guest` status.    |

### `FeatureList`

A static, server-rendered marketing grid (instant links, live click analytics,
security by default, library management) shown alongside `AuthPanel` when logged
out. Takes no props.

---

## Environment

The browser bundle reads a single variable, injected at build/deploy time:

| Variable              | Required | Purpose                                       |
|-----------------------|----------|-----------------------------------------------|
| `NEXT_PUBLIC_API_URL` | yes      | Base URL of the backend the browser calls.    |

If it is unset, `getApiUrl()` throws and the dashboard surfaces the error; the
status bar also displays `NEXT_PUBLIC_API_URL missing`.

For local development:

```bash
# .env.local (repo root)
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Run & build

```bash
npm run dev        # next dev (repo root)
npm run build      # next build
npm run start      # next start
npm run typecheck  # tsc --noEmit
npm test           # tsx --test tests/*.test.ts (API-client unit tests)
```

---

## Related documentation

- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — end-to-end data flow and layering.
- [`docs/API.md`](API.md) — backend endpoint contract the client consumes.
- [`README.md`](../README.md) — setup and quick start.

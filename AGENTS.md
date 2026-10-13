# AGENTS.md

## Project

Hospital queue app (Antrian Rumah Sakit). Native from scratch: HTML + CSS + TypeScript only.
No JS/CSS framework or library (no React, Vue, jQuery, Bootstrap, Tailwind). No template.
Pages: `login.html`, `index.html` (admin dashboard), `operator.html`, `layar.html` (display), `ambil-antrian.html` (self-service). All pages except `login.html` require login.

Demo online starts 14 Oct 2026. Deadline 13 Oct 2026 23:59. Repo public `pweb-ts-p01-2026`. Submit via `https://its.id/m/SubmitPemweb2026`.
Load split for 2 people: Person 1 = toolchain + login + admin; Person 2 = operator + layar + ambil-antrian. Shared contract below is frozen; change only by agreement.

## Commands

- Install: `npm install`
- Typecheck (mandatory after every edit): `npm run typecheck`
- Build: `npm run build`
- Watch during dev: `npx tsc --watch`
- Run: serve repo root with Live Server (VS Code) or `npx serve .`; open `login.html`. `dist/` output is committed so Live Server works on fresh clone.

## Architecture

```text
./                 pages (*.html, one per route)
src/               *.ts sources (rootDir)
  types.ts         frozen shared contract (Ticket, QueueType, unions)
  storage.ts       LocalStorage access only (keys + seed + CRUD helpers)
  auth.ts          login API, session save/load, guards, logout
  login.ts         page entry per HTML file (<name>.html <-> src/<name>.ts)
  admin.ts
  operator.ts
  layar.ts
  ambil.ts
dist/              tsc output, loaded via <script type="module" src="dist/<name>.js">
css/style.css      single shared stylesheet, CSS variables for tokens
tsconfig.json      strict, ES2022 modules (see note)
```

TS modules note: pages load `type="module"` scripts (modules are deferred by default, satisfies the "defer" requirement while allowing shared imports without a bundler).

## Shared contract (frozen)

```ts
// src/types.ts
type Priority = "Normal" | "Lansia" | "Disabilitas" | "VIP";
type TicketStatus = "Menunggu" | "Dipanggil" | "Selesai" | "Dilewati";
interface QueueType { kode: string; nama: string; aktif: boolean; counter: number; code?: string; name?: string; active?: boolean }
interface Ticket { id: string; kode: string; nomor: number; label: string; prioritas: Priority; status: TicketStatus; createdAt: number; code?: string; number?: number; priority?: Priority }
```

- LocalStorage keys: `auth_token`, `auth_role`, `auth_name`, `queue_types`, `tickets`. Nothing else persists.
- Ticket label format: `CODE-NNN`, e.g. `A-001`. Counter is per queue code, resets on Reset Antrian.
- Queue code: exactly 1 uppercase letter. Reject duplicate code/name (case-insensitive). Inactive queue cannot issue new tickets.
- Call order: priority `VIP > Disabilitas > Lansia > Normal`, then FIFO by `createdAt`.
- Roles: API `POST https://dummyjson.com/auth/login` returns role. `moderator` has same rights as `admin`. Access policy lives in one table, `ROLE_ACCESS` in `auth.ts`: `index.html` = admin|moderator; `operator.html`, `layar.html`, `ambil-antrian.html` = any logged-in role (admin|moderator|user). No public pages. Not logged in -> `login.html?next=<page>`; logged in but role not allowed -> own home page + `?denied=<page>` (shows "Akses ditolak").
- Test users reference: `GET https://dummyjson.com/users/filter?key=role&value=admin` and `...&value=user`.

## Code rules

- `strict: true` + `noUncheckedIndexedAccess: true`. Fix the cause, never silence with `any`, `@ts-ignore`, or careless `as`.
- `unknown` for all outside data (API JSON, LocalStorage parse, form input); validate with narrowing before use.
- Public functions need explicit param + return types. Types live in `src/types.ts`, re-exported, imported with `import type`.
- `storage.ts` is the only module touching `localStorage`. Pages never call `localStorage` directly.
- `auth.ts` owns guards: `protectPage(page)` (every page module calls it first; checks `ROLE_ACCESS`, re-checks on `pageshow` and `storage` events so logout in another tab / Back button cannot expose a page), `requireAccess(page)` (one-off re-check), `logout()` clears `auth_*` keys and redirects to `login.html`.
- `try/catch` on every network call; surface loading / empty / error states as visible text, never color-only, never spinner-only.
- No new dependency without approval. `devDependencies` is `typescript` only.

## Auth flow

1. `login.ts` POSTs `{username, password}` to dummyjson, shows loading state on button, catches network/credential errors as text.
2. On success saves token/role/firstName, redirects to `next` (only if that role may open it), otherwise admin/moderator to `index.html`, user to `operator.html`.
3. Guards (`protectPage`) run first in each protected page module before any render.

## Realtime rule

- `layar.html` polls storage every 2-3s (`setInterval`, no reload). `ambil-antrian.html` re-reads active queue types on interval + `window 'storage'` event so new admin queues appear without manual reload.

## UI / accessibility (mandatory, verified not eyeballed)

Visual language follows `DESIGN-airbnb.md` tokens (white canvas `#ffffff`, ink `#222222`, hairline `#dddddd`, radius 8px buttons / 14px cards, 48px primary CTA). Exceptions below override it.

- Contrast: normal text >= 4.5:1, large text (>=18px) >= 3:1, component boundaries/focus >= 3:1. Verified values: ink on white 15.91 pass; muted `#6a6a6a` on white 5.41 pass; error `#c13515` on white 5.54 pass.
- Brand red: `#ff385c` on white is **3.52, FAILS for text**. Use it only for large graphics/icons. All button/CTA text uses `#e00b41` (4.89 pass) or white on ink.
- Never `outline: none` without a `:focus-visible` replacement (2px solid, 3:1 against neighbor). Check in every theme shipped.
- Full keyboard operability: logical tab order = visual order, Enter/Space activates, Escape closes dialogs, no hover-only menus, no drag-only action.
- Every status pairs color with text or icon (e.g. "Dipanggil", "Selesai", "Dilewati", error strings like "Username atau password salah").
- Every data view ships empty + loading (with text) + error (what happened + next step) states.
- Text reflows at 200% zoom, no `overflow: hidden` clipping on text containers. Tap targets >= 44px. Focused input scrolls above mobile keyboard (bottom padding, `scrollIntoView`).
- Fluid type, `css/style.css` variables only, no magic hex outside `:root`.

## Workflow

1. State plan briefly before editing. Touch only files the task needs.
2. After editing run `npm run typecheck`; fix all errors; smoke-test affected page in browser (login fail/success, refresh persistence, guard redirect when logged out, ticket full cycle ambil -> panggil -> selesai).
3. Keep diffs minimal; no speculative abstraction, no "for later" code.

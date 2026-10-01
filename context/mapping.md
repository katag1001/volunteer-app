# Codebase Map

Explains what each file does and where to find it. Treat this as the map of
the actual codebase, not a plan of what's intended — update it whenever the
code changes shape.

**Current scope**: accounts (signup, email verification, login, password
reset, admin approval of new signups, admin promote/demote/delete of
members, self-delete) plus a simple **disputes** board — a kanban of
disputes that members pick up, resolve and reopen. The old profile
(`UserProfile`), directory, and projects/issues/tasks/polls systems were
removed in the 2026-10 overhaul (see "History" at the bottom).

Many code comments still cite `prd.md §x.y` (e.g. "prd.md §3.2 — lazy
expiry"). `prd.md` itself was deleted in the overhaul; those citations are
historical pointers to the original requirement, not a live document.

## Architecture

- **Frontend** = the Vite/React app at the repo root (`src/`).
- **Backend** = an Express app whose entry point is `api/index.js`, with all
  of its logic under `server/` (models, controllers, routes, middleware,
  utils). It talks to MongoDB via Mongoose.
- Both live in the **one root `package.json`** — there is a single
  `npm install`. `api/package.json` and `server/package.json` only exist to
  mark those folders as CommonJS (`"type": "commonjs"`), since the root
  package is ESM for Vite.
- **Deployment (Vercel Hobby)**: `vercel.json` rewrites `/api/*` to the
  `api/index.js` serverless function and everything else to `index.html`.
  `api/index.js` exports the Express app for Vercel and only calls
  `app.listen()` when run directly with node.
- The frontend always calls a relative `/api/...` path: same-origin on
  Vercel, and proxied to `http://localhost:4444` by `vite.config.js` in dev.

## Running the app

```
npm install
npm run dev:api     # Express API via nodemon, http://localhost:4444
npm run dev         # Vite dev server, http://localhost:5173 (proxies /api)
```

Both read the repo-root `.env` (gitignored, never commit it). Required vars:
`MONGODB_URI`, `PORT`, `ADMIN_EMAIL`, `AUTH_SECRET`, `EMAIL_USER`,
`EMAIL_APP_PASSWORD`, `FRONTEND_URL`.

Other scripts:

- `npm run seed -- --email ... --password ... --first ... --last ...
  [--verified] [--approved] [--admin]` — create an `AuthUser` directly,
  bypassing signup/verification (`--admin` implies verified + approved).
- `npm run db:drop-removed [-- --confirm]` — the one-off overhaul cleanup;
  see `server/scripts/dropRemovedCollections.js` below.
- `npm run build` / `npm run lint` (oxlint).

**Windows gotcha**: stopping a backgrounded nodemon process doesn't reliably
kill its child node process on this setup — it can be orphaned and keep
holding port 4444, serving stale code. If the backend seems to be running
old code, check `netstat -ano | grep :4444` for the owning PID rather than
trusting the visible terminal.

## Repo layout

```
volunteer_organiser/
├── context/
│   └── mapping.md              # this file
├── api/
│   ├── index.js                # Express entry: body parsing, CORS, per-request DB connect, mounts routes
│   └── package.json            # just marks the folder CommonJS
├── server/
│   ├── package.json            # just marks the folder CommonJS
│   ├── config/
│   │   └── db.js               # memoised Mongoose connection (8s server-selection timeout)
│   ├── models/
│   │   ├── AuthUser.js         # credentials + identity + approval/admin flags
│   │   └── Dispute.js          # type / date_raised / picked_up_by / status / order_no / user_no / details / resolution_notes
│   ├── middleware/
│   │   └── auth.js             # sessionStateFor / attachUser / requireAuth / requireActiveMember / requireAdmin
│   ├── routes/
│   │   ├── authRoutes.js       # /api/auth/*
│   │   ├── adminRoutes.js      # /api/admin/* — all behind requireAdmin
│   │   ├── accountRoutes.js    # /api/account/* — all behind requireActiveMember
│   │   └── disputeRoutes.js    # /api/disputes/* — all behind requireActiveMember (delete: requireAdmin)
│   ├── controllers/
│   │   ├── authController.js   # signup / verifyEmail / login / forgotPassword / resetPassword / session / demos
│   │   ├── adminController.js  # pending users + count / approve / reject / list users / admin-status / delete
│   │   ├── accountController.js # deleteMyAccount (self-delete)
│   │   └── disputeController.js # CRUD + pick-up / unpick / resolve / reopen
│   ├── utils/
│   │   ├── jwt.js              # 7-day session JWTs (AUTH_SECRET)
│   │   ├── verificationToken.js # 3-day email-verification link token
│   │   ├── resetToken.js       # 1-hour password-reset link token
│   │   ├── accountExpiry.js    # the two lazy-expiry rules + purgeIfExpired()
│   │   ├── mailer.js           # nodemailer/Gmail: verification, reset, pending-approval emails
│   │   └── deleteAccount.js    # deleteUserAccount() — the single delete path for approved members
│   └── scripts/
│       ├── seedUser.js               # CLI: create an AuthUser directly
│       └── dropRemovedCollections.js # one-off: drop the collections of removed models
├── src/
│   ├── main.jsx                # React root, wraps <App/> in <BrowserRouter>
│   ├── App.jsx                 # route table
│   ├── index.css               # global reset + imports design tokens
│   ├── styles/tokens.css       # design tokens (colours light/dark, type scale, spacing, radius, shadow)
│   ├── lib/
│   │   ├── api.js              # fetch wrapper: JSON in/out, bearer token, errors carry .status/.data
│   │   ├── session.js          # localStorage token get/set/clear + fetchSession()
│   │   └── disputes.js         # dispute type/status labels, date format, picked-up-by name
│   ├── components/
│   │   ├── AppLayout.jsx/.css  # side nav + content column for every logged-in page
│   │   ├── DisputeStatusBadge.jsx/.css # new / underway / resolved pill
│   │   ├── AddDisputeModal.jsx # TEMPORARY add-dispute form, opened from DisputesPage
│   │   ├── RequireActiveMember.jsx # client guard: active/admin only, else redirect to matching holding page
│   │   ├── RequireAdmin.jsx    # client guard: admin only, else redirect to /
│   │   ├── DeleteAccountSection.jsx/.css # self-delete UI (password re-entry in a Modal), on AccountPage
│   │   └── ui/                 # shared primitives: PageShell, Card, Button, FormField, Modal (+ index.js barrel)
│   └── pages/
│       ├── SignupPage.jsx            # /signup
│       ├── CheckInboxPage.jsx        # /check-inbox
│       ├── VerifyEmailPage.jsx       # /verify?token=...
│       ├── WaitingApprovalPage.jsx   # /waiting-approval
│       ├── LoginPage.jsx             # /login
│       ├── ForgotPasswordPage.jsx    # /forgot-password
│       ├── ResetPasswordPage.jsx     # /reset-password?token=...
│       ├── AuthPages.css             # shared styles for all of the above
│       ├── DashboardPage.jsx/.css    # / — placeholder "Welcome back" home
│       ├── AccountPage.jsx/.css      # /account — name/email + self-delete
│       ├── DisputesPage.jsx/.css     # /disputes?tab=all|mine — kanban board + Add dispute button
│       ├── DisputeDetailPage.jsx/.css # /disputes/:id — full details + pick up / undo / resolve / reopen
│       └── admin/
│           ├── AdminPage.jsx         # /admin?tab=approvals|members
│           ├── ApprovalsPanel.jsx    # pending signups: approve / reject
│           ├── MembersPanel.jsx      # all members: set/unset admin, delete
│           └── AdminPages.css
├── public/                     # static assets served as-is (empty)
├── index.html                  # Vite HTML entry
├── vite.config.js              # React + React Compiler; dev proxy /api -> :4444
├── vercel.json                 # /api/* -> serverless function, everything else -> index.html
└── package.json                # all deps (frontend + backend) and scripts
```

## Backend

### `api/index.js`

Loads the root `.env` by explicit path (works both as `node api/index.js`
and as a bundled Vercel function), sets up JSON/urlencoded parsing and
CORS, then runs a middleware that awaits `connectToDatabase()` before every
request — on a serverless cold start there's no connection yet, and without
this Mongoose's own 10s query buffer would time out first and hide the real
connection error (responds `503 database_unavailable` instead). Mounts:

- `/api/auth` → `authRoutes.js`
- `/api/admin` → `adminRoutes.js`
- `/api/account` → `accountRoutes.js`
- `/api/disputes` → `disputeRoutes.js`

### `server/models/AuthUser.js`

Fields: `email` (unique, lowercased), `password_hash` (`select: false`),
`first_name`, `last_name`, `email_verified`/`email_verified_at`,
`is_approved`/`approved_at`, `is_admin`, `is_seed_admin`, `created_at`.

- Set `user.password = 'plaintext'` and `.save()` — a `pre('validate')` hook
  hashes it into `password_hash` with bcrypt. (It has to be `pre('validate')`,
  not `pre('save')`: Mongoose runs `save` hooks after validation, which is
  too late for the `required` check.)
- `password_hash` is never returned by default; only `login` and the
  self-delete endpoint fetch it with `.select('+password_hash')`.
- `comparePassword()` and `toPublicJSON()` are instance methods. Every API
  response sends `toPublicJSON()`, never the raw document.

### `server/middleware/auth.js`

`sessionStateFor(user)` maps a user to `signed_out` / `unverified` /
`unapproved` / `active` / `admin` (an admin is always verified + approved
too; `admin` is just the more specific label). Layered middlewares:

- `attachUser` — soft: decodes the bearer token if present, sets `req.user`
  and `req.sessionState`, never blocks.
- `requireAuth` — `401 signed_out` if no valid user.
- `requireActiveMember` — additionally `403 unverified|unapproved`.
- `requireAdmin` — additionally `403 forbidden` unless admin.

### Auth — `authController.js` / `authRoutes.js` (`/api/auth`)

- `POST /signup { email, first_name, last_name, password }` — creates the
  unverified, unapproved `AuthUser` and emails a verification link. Password
  minimum is 8 chars. A failed email send is logged, not fatal (the answer to
  an undelivered email is the 3-day expiry, not a resend). In
  non-production the link is also logged to the server console.
  `409 email_taken` on a duplicate.
- `POST /verify-email { token }` — marks the account verified. If the email
  matches `ADMIN_EMAIL` it is also made the **seed admin** (`is_admin`,
  `is_seed_admin`, `is_approved` all set in the same save) and skips the
  approval wait. Otherwise every admin gets a "pending approval" email. An
  expired-but-genuinely-signed token deletes the still-unverified account
  and returns `410 expired`.
- `POST /login { email, password }` — runs `purgeIfExpired` first (so a
  login attempt is one of the lazy-expiry trigger points), then
  `401 invalid_credentials`, or `403 unverified|unapproved`, or
  `200 { token, user }`. Tokens are only ever issued to active/admin users.
- `POST /forgot-password { email }` — always `200 check_inbox` whether or not
  the email exists (no account enumeration). Works regardless of
  verified/approved state.
- `POST /reset-password { token, password }` — `410 expired` /
  `400 invalid_link`, else sets the new password.
- `GET /session` — `{ state, user }`, never blocks.
- `GET /protected-demo` (requireActiveMember) and `GET /admin-demo`
  (requireAdmin) — throwaway endpoints proving the middleware works. Safe to
  delete once real protected routes exist again.

### Lazy expiry — `server/utils/accountExpiry.js`

Two clocks, enforced lazily (no cron, no notification — the account just
disappears):

1. Unverified for more than 3 days after `created_at`.
2. Verified but unapproved for more than 2 weeks after `email_verified_at`.

`purgeIfExpired(user)` deletes the account if either applies. Triggered by
a login attempt and by the admin pending-users list/count endpoints.

### Admin — `adminController.js` / `adminRoutes.js` (`/api/admin`, all `requireAdmin`)

- `GET /pending-users` — verified-but-unapproved users, after sweeping the
  2-week approval expiry across them.
- `GET /pending-users/count` — same sweep, just the number (nav badge).
- `POST /users/:id/approve` — sets `is_approved`/`approved_at`.
  `400 not_pending` if the user isn't verified-and-unapproved.
- `POST /users/:id/reject` — deletes the pending account immediately and
  silently; they're free to sign up again.
- `GET /users` — every user, as `toPublicJSON()`.
- `PATCH /users/:id/admin-status { is_admin }` — promote/demote any user.
  `403 seed_admin_protected` for the seed admin.
- `DELETE /users/:id` — via `deleteUserAccount()`. `403 seed_admin_protected`
  for the seed admin, `403 use_self_delete` for the caller's own account.

### Account — `accountController.js` / `accountRoutes.js` (`/api/account`, all `requireActiveMember`)

- `DELETE /me { password }` — self-delete. Re-checks the password,
  `401 invalid_password` on mismatch, `403 seed_admin_protected` for the
  seed admin (who can never be deleted by anyone, including themselves).

### Disputes — `Dispute.js` / `disputeController.js` / `disputeRoutes.js` (`/api/disputes`)

**Model** (`server/models/Dispute.js`):

| Field | Type | Notes |
|---|---|---|
| `type` | `too_small` \| `too_big` \| `no_item` | required |
| `date_raised` | Date | defaults to now |
| `picked_up_by` | AuthUser id | `null` until picked up |
| `status` | `new` \| `underway` \| `resolved` | defaults to `new` |
| `order_no`, `user_no`, `details` | String | default `''`, free text |
| `resolution_notes` | String | default `''`, set when resolving |

`DISPUTE_TYPES` / `DISPUTE_STATUSES` are exported from the model for
validation. `status` and `picked_up_by` only change through the action
endpoints, never through the generic `PATCH`.

**Endpoints** (all `requireActiveMember`):

- `GET /` — every dispute, sorted oldest `date_raised` first.
  `?mine=true` limits it to ones picked up by the caller.
- `POST / { type, order_no?, user_no?, details? }` — create.
  `400 invalid_type` / `400 invalid_input` (a non-string text field).
  `resolution_notes` is ignored on create.
- `GET /:id` — one dispute. A malformed id 404s the same as a missing one.
- `PATCH /:id { type?, order_no?, user_no?, details?, resolution_notes? }` —
  plain field edits. Nothing in the UI calls this yet.
- `DELETE /:id` — **admin only** (`requireAdmin` on that one route).
  Nothing in the UI calls this yet.
- `POST /:id/pick-up` — `new` → `underway`, `picked_up_by` = caller. Anyone
  can pick up an unclaimed dispute. `409 already_picked_up` if it isn't
  `new` (no taking over someone else's).
- `POST /:id/unpick` — `underway` → `new`, `picked_up_by` cleared.
- `POST /:id/resolve { resolution_notes }` — `underway` → `resolved`.
- `POST /:id/reopen` — `resolved` → `underway`, keeping `picked_up_by` and
  `resolution_notes`.
- unpick / resolve / reopen are allowed only for the person who picked it
  up **or any admin** (`403 forbidden` otherwise), and `409 not_underway` /
  `409 not_resolved` if the dispute isn't in the right state.

Every response serialises `picked_up_by` as `{ id, first_name, last_name }`
(or `null`), resolved with one `AuthUser` query per request
(`serializeDisputes`). A reference to a deleted user comes back as
`"Deleted user"`.

### `server/utils/deleteAccount.js`

`deleteUserAccount(userId)` — the one delete path for approved members, used
by both admin delete and self-delete. Deletes the `AuthUser`, then puts any
disputes they had **underway** back to `new` and unassigned. Their
**resolved** disputes keep the dangling `picked_up_by` as history (shown as
"Deleted user"). Cascade any future per-user cleanup here too. (Lazy-expiry
purges and admin reject call `deleteOne()` directly: an account that was
never approved can't own anything else.)

### Emails — `server/utils/mailer.js`

nodemailer over Gmail (`EMAIL_USER` + `EMAIL_APP_PASSWORD`). Verification
links go to `${FRONTEND_URL}/verify?token=...`, reset links to
`${FRONTEND_URL}/reset-password?token=...`, plus the pending-approval
notification sent to every admin.

### `server/scripts/dropRemovedCollections.js`

One-off cleanup for the overhaul. Lists (dry run, the default) or with
`--confirm` drops these collections if present: `userprofiles`, `projects`,
`projectmembers`, `projectteams`, `issues`, `issuemembers`, `tasks`,
`tasklinks`, `polls`, `polloptions`, `pollvotes`. `authusers` and
`disputes` are never touched; any other unrecognised collection is reported but not dropped.
Uses the root `.env`'s `MONGODB_URI`; override it inline to target another
database (e.g. production). Safe to delete once every database has been
cleaned.

## Frontend

- **Routing (`App.jsx`)** — public routes: `/signup`, `/login`,
  `/check-inbox`, `/verify`, `/waiting-approval`, `/forgot-password`,
  `/reset-password`. Everything else is nested inside
  `<RequireActiveMember><AppLayout/></RequireActiveMember>`: `/` (Dashboard),
  `/disputes`, `/disputes/:id`, `/account`, and `/admin` (additionally
  wrapped in `RequireAdmin`).
- **`AppLayout`** — persistent side nav: Home; Disputes with All disputes /
  My disputes sub-links (`/disputes?tab=all|mine`); My account; and for
  admins an Admin section with Approvals (with pending-count badge) and
  Members sub-links (`/admin?tab=...`). `tabLinkClass(pathname, tab,
  defaultTab)` works out which sub-link is active, since NavLink only
  compares pathnames. Log out clears the token and goes to `/login`.
- **Holding screens** — no token is ever issued to an unverified/unapproved
  user, so `LoginPage` is what sends them to `/check-inbox` /
  `/waiting-approval` (on the `403` from login). On success login goes
  straight to `/`.
- **`DashboardPage`** (`/`) — placeholder "Welcome back, <name>" page.
- **`AccountPage`** (`/account`) — shows name and email, plus
  `DeleteAccountSection` (hidden for the seed admin). After a successful
  self-delete the token is cleared and the user lands on `/login`.
- **Admin (`/admin`)** — one page with two tabs (`?tab=approvals|members`).
  Reject and Delete both go through a confirmation `Modal`. Set Admin and
  Delete are disabled on the seed admin's row.
- **`DisputesPage`** (`/disputes?tab=all|mine`) — "Add dispute" button top
  right, then a card with the All / My disputes tab buttons (same styling
  and `?tab=` pattern as `/admin`) above a three-column kanban: New and
  Underway sorted oldest first, Resolved newest first (by `date_raised`,
  sorted client-side). Cards show type, status, date and who picked it up,
  and link to the detail page. "My disputes" fetches `?mine=true`. Loaded
  data is tagged with the tab it belongs to, so switching tabs shows
  "Loading…" instead of the old tab's board.
- **`AddDisputeModal`** — **temporary**: type (required) + order no / user
  no / details. To remove it later, delete the file plus its import, button
  and `addOpen`/`handleCreated` state in `DisputesPage`.
- **`DisputeDetailPage`** (`/disputes/:id`) — Back button at the top (goes
  back in history to keep the board's tab, or to `/disputes` if opened
  directly), then every field. Buttons depend on status and who's viewing:
  `new` → **Pick up** (anyone); `underway` → **Resolve** + **Undo pick up**
  (picker or admin); `resolved` → **Reopen** (picker or admin). Resolve opens
  a `Modal` with a resolution-notes textarea, pre-filled with any existing
  notes. On a `409` (someone else changed it first) it shows a message and
  reloads the dispute so the buttons match.
- **Design system** — build every screen from `src/components/ui/`
  primitives and `src/styles/tokens.css` variables rather than styling ad
  hoc. `DisputeStatusBadge` reuses the `--color-status-*` tokens
  (`not-started` for `new`, `underway`, `resolved`).

## History

- **Original build** — phases 0 / A1–A7 (auth, approvals, password reset,
  profiles, account deletion, directory) and B1–B6 (projects, issues, tasks,
  polls, status engine, deletion cascade), driven by `prd.md` and
  `build-plan.md`. The backend later moved from `api/` into `server/`, with
  `api/index.js` kept as the Vercel entry point.
- **2026-10 overhaul** — cut back to accounts only:
  - Removed the `UserProfile` model and everything built on it: profile
    completion/edit pages, the skill→team config (`config/skillTeams.json`),
    preset profile pictures, key-player flag, `last_login` / "recently
    active", and the `/profile` API.
  - Removed the directory (page + `/directory` API).
  - Removed projects, project members/teams, issues, issue members, tasks,
    task links, polls (options/votes), the status engine, and the projects
    dashboard, along with their APIs and UI.
  - Self-delete moved from `DELETE /api/profile/me` to
    `DELETE /api/account/me`, with a new `/account` page.
  - `deleteUserAccount()` reduced to deleting the `AuthUser`.
  - Deleted `prd.md`, `build-plan.md`, and `Cherry_organiser_plan.md`.
  - Added `server/scripts/dropRemovedCollections.js` to clean the
    now-orphaned collections out of MongoDB.
- **2026-10 disputes** — added the `Dispute` model, `/api/disputes` (CRUD +
  pick-up / unpick / resolve / reopen), the disputes kanban board, the
  detail page, the temporary add-dispute modal, and the Disputes sidebar
  section. `deleteUserAccount()` now also releases the deleted user's
  underway disputes. Verified with 28 API checks against a throwaway
  in-memory MongoDB: permissions, state transitions, `?mine`, validation,
  admin-only delete, and the deletion cascade.

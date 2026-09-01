# Codebase Map

Companion to `prd.md` and `build-plan.md`. Explains what each file does and
where to find it. Updated as each build-plan phase lands — treat this as the
map of the actual codebase, not a plan of what's intended.

## Architecture note (deviation from `prd.md` §2)

`prd.md` specifies a single Next.js (App Router) app with the backend as
Next.js API routes in the same project. The repo already had a **Vite +
React frontend** and a **separate standalone Express server** (`/api`) wired
together before this build started, and the app owner asked to keep that
connection rather than migrate to Next.js. So throughout this build:

- **Frontend** = the Vite/React app at the repo root (`src/`).
- **Backend** = the Express app in `api/`, its own npm project, running as
  its own process (default port `4444`), talking to MongoDB via Mongoose.
- The two are two separate `npm install` / `npm run dev` targets — see
  "Running the app" below.
- Anywhere `prd.md`/`build-plan.md` say "Next.js API route", read that as
  "an Express route in `api/routes` + `api/controllers`".
- Deployment target (Vercel Hobby) is unchanged in principle, but the two
  services will need to be deployed separately (e.g. the Express app as its
  own Vercel serverless entry point, or on a small always-on host) — not yet
  decided; revisit before deployment.

## Running the app

Two processes, run separately:

```
# frontend (repo root)
npm install
npm run dev        # Vite dev server, http://localhost:5173

# backend (api/)
cd api
npm install
npm run dev        # nodemon, http://localhost:4444
```

Backend needs `api/.env` (copy `api/.env.example` and fill in real values —
`.env` files are gitignored, never commit them).

**Windows gotcha**: stopping a backgrounded `npm run dev` (nodemon) process
doesn't reliably kill its child `node index.js` process on this setup — the
child can be orphaned and keep running (and keep holding port 4444) even
after the terminal/task that started it is gone. If the backend seems to be
serving stale code, check `netstat -ano | grep :4444` for the actual owning
PID and compare it against when you last restarted, rather than assuming
the visible terminal reflects what's really bound to the port.

## Repo layout

```
volunteer_organiser/
├── config/
│   └── skillTeams.json      # shared skill→team mapping (prd.md §3.5)
├── context/
│   ├── prd.md                # product requirements (source of truth for behaviour)
│   ├── build-plan.md         # phased build order this project follows
│   └── mapping.md            # this file
├── api/                      # Express backend (its own npm project)
│   ├── index.js               # app entrypoint: express setup, CORS, DB connect, mounts routes
│   ├── config/
│   │   └── db.js              # Mongoose connection helper (memoised, reused across calls)
│   ├── models/
│   │   ├── AuthUser.js          # prd.md §3.1 AuthUser — bcrypt password hashing on save
│   │   ├── UserProfile.js       # prd.md §3.1 UserProfile — one per approved member
│   │   ├── Project.js            # prd.md §4.1 — status is derived, never set directly
│   │   ├── ProjectMember.js      # prd.md §4.1 — role 'contact'|'member', unique (project_id, user_id)
│   │   ├── ProjectTeam.js        # prd.md §4.1 — unique (project_id, team)
│   │   ├── Issue.js              # prd.md §4.1 — see Phase B1 note: exists ahead of Phase B3's routes
│   │   ├── IssueMember.js        # prd.md §4.1 — unique (issue_id, user_id); subset of project membership
│   │   ├── Task.js               # prd.md §4.1 — the one manually-set status in the whole app
│   │   ├── TaskLink.js           # prd.md §4.1 — simple URL attachments, no preview/validation beyond being a URL
│   │   ├── Poll.js               # prd.md §4.1
│   │   ├── PollOption.js         # prd.md §4.1 — addable any time by anyone on the project, not just at creation
│   │   └── PollVote.js           # prd.md §4.1 — unique (poll_id, option_id, user_id), NOT (poll_id, user_id)
│   ├── utils/
│   │   ├── jwt.js                # sign/verify session JWTs (AUTH_SECRET)
│   │   ├── verificationToken.js  # sign/verify the 3-day email-verification link token
│   │   ├── resetToken.js         # sign/verify the 1-hour password-reset link token
│   │   ├── accountExpiry.js      # the two lazy-expiry checks + purgeIfExpired()
│   │   ├── mailer.js             # nodemailer/Gmail transport + verification/reset emails
│   │   ├── skillTeams.js         # backend copy of the skillTeams.json derivation helpers
│   │   ├── ensureProfile.js      # creates a default UserProfile for a newly-approved AuthUser
│   │   ├── deleteAccount.js      # deleteUserAccount() — AuthUser + UserProfile + every live Section B relationship, account-wide
│   │   ├── recentlyActive.js     # isRecentlyActive(lastLogin) — last_login within 3 days, computed live
│   │   ├── statusEngine.js       # prd.md §4.2 — calculateIssueStatus/calculateProjectStatus + recalculate*() cascade
│   │   ├── isProjectMember.js    # isProjectMember(projectId, userId) — the "any current project member" gate
│   │   ├── leaveProject.js       # leaveProject(projectId, userId) — membership + assigned-task cleanup
│   │   └── deleteProject.js      # deleteProjectCascade(projectId) — project + members + teams + issues/tasks/polls
│   ├── middleware/
│   │   └── auth.js              # attachUser / requireAuth / requireActiveMember / requireAdmin
│   ├── routes/
│   │   ├── authRoutes.js        # /auth/signup, /verify-email, /login, /forgot-password, /reset-password, /session, protected-route demos
│   │   ├── adminRoutes.js       # /admin/* — all behind requireAdmin
│   │   ├── profileRoutes.js     # /profile/me — behind requireActiveMember
│   │   ├── directoryRoutes.js   # /directory/* — behind requireActiveMember
│   │   ├── projectRoutes.js     # /projects/* — behind requireActiveMember (individual actions add membership checks); also mounts the nested issue list/create routes
│   │   ├── issueRoutes.js       # /issues/:id, /issues/:id/members — behind requireActiveMember; also mounts the nested task and poll list/create routes
│   │   ├── taskRoutes.js        # /tasks/:id/assign, /status, /resolve, /links — behind requireActiveMember
│   │   └── pollRoutes.js        # /polls/:id/options, /vote, /close — behind requireActiveMember
│   ├── controllers/
│   │   ├── authController.js    # signup / verifyEmail / login / forgotPassword / resetPassword / session / demo handlers
│   │   ├── adminController.js   # pending-users / approve / reject / list-users / admin-status / key-player / delete
│   │   ├── profileController.js # getMyProfile / updateMyProfile / deleteMyAccount
│   │   ├── directoryController.js # listMembers (grid) / getMember (full profile, respects visibility toggles)
│   │   ├── projectController.js # list / create / get / join / leave / team tags / contact / delete
│   │   ├── issueController.js   # listIssues / createIssue / getIssue / addIssueMember / removeIssueMember
│   │   ├── taskController.js    # listTasks / createTask / assignTask / setTaskStatus / resolveTask / addTaskLink
│   │   └── pollController.js    # listPolls / createPoll / addPollOption / toggleVote / closePoll
│   ├── scripts/
│   │   └── seedUser.js          # CLI: create an AuthUser directly (bypasses signup/verification)
│   ├── .env                   # local secrets (gitignored, not committed)
│   └── .env.example           # documents required env vars, safe to commit
├── src/                       # Vite/React frontend
│   ├── main.jsx                # React root, wraps <App/> in <BrowserRouter>
│   ├── App.jsx                 # route table (react-router-dom)
│   ├── index.css               # global reset + imports design tokens
│   ├── styles/
│   │   └── tokens.css          # design tokens: colour palette, type scale, spacing, radius, shadow
│   ├── lib/
│   │   ├── api.js               # fetch wrapper: JSON in/out, bearer token, typed error.data
│   │   ├── session.js           # localStorage token get/set/clear + fetchSession()
│   │   ├── skillTeams.js        # frontend copy of the skillTeams.json derivation helpers
│   │   └── profilePictures.js   # imports the 4 preset images, keyed the same as the backend's allow-list
│   ├── pages/                  # one file per route, see below
│   │   ├── DirectoryPage.jsx/.css # /directory — grid, filters, click-through profile modal
│   │   ├── ProjectsPage.jsx/.css  # /projects — landing grid + create-project modal
│   │   ├── ProjectDetailPage.jsx/.css # /projects/:id — header, issues list, team tags, members, join/leave/delete
│   │   └── admin/                # ApprovalsPage, AdminUsersPage (admin-only, see below)
│   ├── components/
│   │   ├── RequireAdmin.jsx        # client-side route guard for /admin/* pages
│   │   ├── RequireActiveMember.jsx # client-side route guard for any approved-member-only page
│   │   ├── IssueCard.jsx/.css      # collapsed/expand-in-place issue card, on ProjectDetailPage
│   │   ├── TaskRow.jsx/.css        # per-task controls (assign/status/resolve/links), inside an expanded IssueCard
│   │   ├── PollCard.jsx/.css       # per-poll voting/add-option/close controls, inside an expanded IssueCard
│   │   ├── ProfileForm.jsx/.css    # the shared form used by both CompleteProfilePage and EditProfilePage
│   │   ├── DeleteAccountSection.jsx/.css # self-delete UI, password re-entry via Modal; on EditProfilePage
│   │   ├── StatusBadge.jsx/.css    # not_started/underway/resolved pill, shared across Section B UI
│   │   └── ui/                   # shared layout primitives (Phase 0 design system)
│   │       ├── PageShell.jsx/.css   # page-level wrapper (max-width container + background)
│   │       ├── Card.jsx/.css        # surface container used for sections/panels
│   │       ├── Button.jsx/.css      # variants: primary / secondary / ghost / danger
│   │       ├── FormField.jsx/.css   # label + input/textarea/select wrapper with hint/error text
│   │       ├── Modal.jsx/.css       # dialog with backdrop click / Escape to close
│   │       └── index.js             # barrel export for the above
│   └── assets/images/profile_pictures/   # preset profile picture options (prd.md §3.5)
├── public/                    # static assets served as-is (currently empty)
├── index.html                 # Vite HTML entry
├── vite.config.js
├── package.json                # frontend deps/scripts
└── .gitignore                  # now includes .env / .env.* everywhere in the repo
```

## Current state by file (Phase 0 — foundations)

- **`api/index.js`** — Express app bootstrap. Loads env vars, sets up
  JSON/urlencoded body parsing, calls `connectToDatabase()`, enables CORS,
  mounts routes, starts listening on `PORT`.
- **`api/config/db.js`** — new in Phase 0. Wraps `mongoose.connect` in a
  memoised promise so repeated calls reuse the same connection instead of
  reconnecting; reads `MONGODB_URI` from env.
- The original placeholder `/test` scaffold (`routes.js`, `controllers.js`,
  `models.js` — a `getTest`/`postTest` round trip proving the frontend could
  reach the backend) was **removed in Phase A2**, once real `/auth` routes
  existed to prove that connection more convincingly. Confirmed with the app
  owner before deleting, since this repo has no git history to recover from.
- **`config/skillTeams.json`** — the skill→team mapping from `prd.md` §3.5,
  as plain JSON (not `.js`) specifically so it can be `require()`'d from the
  CommonJS backend and `import`ed from the ESM frontend without any build
  step or duplication. The master team list (used for the directory filter,
  profile "team" field, and `ProjectTeam` tagging) is the de-duplicated union
  of this file's values — computed at the point of use, not stored
  separately.
- **`src/styles/tokens.css`** — CSS custom properties for the whole design
  system: colour palette (light + dark via `prefers-color-scheme`), font
  stack and type scale, 4px-based spacing scale, corner radii, shadows.
  Colour direction is a deep cherry red primary on a warm cream background,
  loosely referencing cherry.org.uk's warmth per `prd.md` §5, but toned down
  from that site's playful marketing tone toward something clean and
  organised, matching the PRD's explicit styling brief.
- **`src/components/ui/`** — the reusable primitives every later screen
  (directory, project pages, forms, admin views) should be built from,
  instead of styling ad hoc per build-plan Phase 0.
- **`src/App.jsx`** — was a Phase-0 placeholder screen (status-pill/button
  swatches + the `/test/getTest` connectivity check); replaced in Phase A2 by
  a real route table once actual pages existed to prove the design system
  and the connection both work.
- **`.gitignore`** (root) and **`api/.gitignore`** — updated to ignore `.env`
  and `.env.*` everywhere in the repo (with `.env.example` explicitly
  un-ignored so the documented var list stays committed).

## Current state by file (Phase A1 — Auth foundation)

`prd.md` specifies Auth.js for session handling, but Auth.js is a
Next.js-oriented library and doesn't run on a plain Express backend (the
architecture deviation from Phase 0). Session handling here is instead a
small hand-rolled JWT layer using the `jsonwebtoken` + `bcrypt` packages that
were already in `api/package.json`. Functionally it satisfies the same
requirement from `prd.md` §2/§3.4 (JWT session strategy, no server-side
session store, bcrypt-hashed passwords never selected/logged by default).

- **`api/models/AuthUser.js`** — the `prd.md` §3.1 `AuthUser` schema. Set
  `user.password = 'plaintext'` and `.save()`; a `pre('validate')` hook
  hashes it into `password_hash` before the `required` check runs (a
  `pre('save')` hook runs *after* validation in Mongoose, which is too late —
  this was caught and fixed during this phase's smoke test).
  `password_hash` has `select: false`, so it's never returned by default
  queries — callers must explicitly `.select('+password_hash')` (only the
  login controller does this). `comparePassword()` and `toPublicJSON()` are
  instance methods; the latter is what every API response should send back,
  never the raw document.
- **`api/utils/jwt.js`** — `signSessionToken(user)` issues a 7-day JWT
  (`{ sub: user._id }`, signed with `AUTH_SECRET`). `verifySessionToken`
  returns `null` on any missing/invalid/expired token rather than throwing —
  callers treat "no valid token" as "signed out", not an error.
- **`api/middleware/auth.js`** — the route-protection helper build-plan
  Phase A1 asks for. `sessionStateFor(user)` maps an `AuthUser` to one of
  `signed_out` / `unverified` / `unapproved` / `active` / `admin` (an admin
  is always verified+approved too; `admin` is just the more specific label).
  Three middlewares layer on top: `attachUser` (soft — decodes the token if
  present, never blocks, used by `/auth/session`), `requireAuth` (401s if
  not signed in), `requireActiveMember` (403s with the specific reason if
  unverified/unapproved), `requireAdmin` (403 `forbidden` unless admin).
  Later phases guard real routes with `requireActiveMember`/`requireAdmin`
  the same way the demo routes below do.
- **`api/controllers/authController.js`** / **`api/routes/authRoutes.js`** —
  mounted at `/auth`:
  - `POST /auth/login` — email+password, returns `401 invalid_credentials`,
    or `403 { error: 'unverified' | 'unapproved' }` per `prd.md` §3.4, or
    `200 { token, user }` on success.
  - `GET /auth/session` — reports `{ state, user }` without blocking; the
    frontend will use this to decide which holding screen (if any) to show.
  - `GET /auth/protected-demo` — behind `requireActiveMember`, and
    `GET /auth/admin-demo` — behind `requireAdmin`. Both are throwaway
    endpoints proving the middleware actually blocks the right callers;
    delete them once Phase A3+ adds real protected routes to demonstrate the
    same thing.
- **`api/scripts/seedUser.js`** — `npm run seed -- --email ... --password ...
  --first ... --last ... [--verified] [--approved] [--admin]`, run from
  `api/`. Creates an `AuthUser` directly (through the model, so the password
  still gets hashed correctly) without going through signup/verification —
  those don't exist until Phase A2/A3. This is how this phase's "seeded test
  user can log in" demo works; it'll stay useful afterward too, for quickly
  creating an admin account without waiting on the real approval flow.
- Verified end-to-end (wrong password, unverified-blocked,
  unapproved-blocked, active login, admin login, `/auth/session` in all
  three signed-in states, and both protected-route demos in allowed/denied
  form) against a throwaway in-memory MongoDB during development — that
  dependency was removed again afterward and isn't part of the app.

## Current state by file (Phase A2 — Signup, verification, approval lifecycle)

- **`api/utils/accountExpiry.js`** — the two lazy-expiry rules from
  `prd.md` §3.2: `isSignupExpired` (unverified, >3 days since `created_at`)
  and `isApprovalExpired` (verified but unapproved, >2 weeks since
  `email_verified_at`). `purgeIfExpired(user)` deletes the account if either
  applies and returns whether it did. Called from `login` (the login-attempt
  trigger point `prd.md` names for both clocks); Phase A3's Approvals page
  will call the same helper in bulk for its own sweep trigger.
- **`api/utils/verificationToken.js`** — a JWT scoped to email verification
  (`purpose: 'verify_email'`, 3-day expiry — this expiry *is* the 3-day rule,
  not a separate check). `verifyVerificationToken` respects expiry normally;
  `decodeExpiredVerificationToken` checks the signature but ignores expiry,
  so an expired-but-genuine link can still be trusted to identify which
  account to purge (a forged token fails signature verification either way,
  so it can't be used to trigger deletion of an arbitrary account).
- **`api/utils/mailer.js`** — nodemailer wired to Gmail (`EMAIL_USER` +
  `EMAIL_APP_PASSWORD`). `buildVerificationLink(token)` points at
  `${FRONTEND_URL}/verify?token=...` — `FRONTEND_URL` isn't in `prd.md`'s env
  var list but is needed to construct a clickable link; added to
  `.env`/`.env.example`.
- **`api/controllers/authController.js`** — `signup` and `verifyEmail`
  added; `login` updated to call `purgeIfExpired` before checking
  credentials, so a login attempt against an expired pending account is the
  moment it actually gets purged. `POST /auth/signup` never fails the whole
  signup if the email send throws (logged and swallowed) — `prd.md`'s answer
  to a truly undelivered email is the 3-day expiry, not a resend, so there's
  nothing else useful to do at signup time. In non-production, the
  verification link is also logged to the server console regardless of
  send success, for local testing without real Gmail credentials configured.
  `verifyEmail` applies the seed-admin bootstrap (`prd.md` §3.3) inline: if
  the verified email matches `ADMIN_EMAIL`, it sets `is_admin`,
  `is_seed_admin`, `is_approved` in the same save, skipping the approval
  wait entirely.
- **Frontend routing** — `react-router-dom` added; `main.jsx` now wraps
  `<App/>` in `<BrowserRouter>`, and `App.jsx` is just the `<Routes>` table.
  `src/lib/api.js` is a thin fetch wrapper (JSON in/out, optional bearer
  token, throws an `Error` with `.status`/`.data` on a non-2xx response so
  callers can branch on the API's error codes). `src/lib/session.js` wraps
  the JWT in `localStorage` and calls `GET /auth/session`.
- **`src/pages/`** — one file per route:
  - `HomePage` (`/`) — calls `fetchSession()` on mount; shows Sign up/Log in
    for `signed_out`, a welcome + Log out for `active`/`admin`, and
    redirects to the matching holding page if it ever sees `unverified`/
    `unapproved` (defensive — see note below on how those states are
    actually reached).
  - `SignupPage` (`/signup`) — email/first/last/password form; on success
    navigates to `/check-inbox`, passing the email through router state for
    the holding page's message.
  - `CheckInboxPage` (`/check-inbox`) — static "we sent a link" message.
  - `VerifyEmailPage` (`/verify?token=...`) — calls `POST
    /auth/verify-email` on mount; routes to `/waiting-approval` on a normal
    verify, shows an in-place "you're the admin, log in now" message if
    `autoApproved`, or an expired/invalid message with a link back to
    `/signup`.
  - `WaitingApprovalPage` (`/waiting-approval`) — static holding message.
  - `LoginPage` (`/login`) — on `403 unverified`/`403 unapproved`, redirects
    to `/check-inbox`/`/waiting-approval` rather than showing a generic
    error — this is the actual mechanism by which those holding screens
    reappear for a returning user, since **no token is ever issued to an
    unverified/unapproved user** (login only succeeds for `active`/`admin`).
    `sessionStateFor` in the backend middleware can technically report
    `unverified`/`unapproved` too, but nothing in this flow currently hands
    out a token that would let `/auth/session` observe those states in
    practice — the holding screens are driven by each API call's direct
    response, not by polling a persistent session.
- **Bug fixed along the way**: `mongoose.connect(uri, { useUnifiedTopology,
  useNewUrlParser })` — leftover options from the pre-existing scaffold —
  throws under the installed Mongoose 9 (`options useunifiedtopology,
  usenewurlparser are not supported`); those two options are gone entirely
  in modern Mongoose. Neither Phase A1's nor this phase's in-memory-Mongo
  smoke tests caught it because both called `mongoose.connect(uri)` directly
  rather than through `config/db.js`/`seedUser.js` — only surfaced when
  connecting to the real Atlas cluster. Fixed in both `api/config/db.js` and
  `api/scripts/seedUser.js`.
- Verified two ways: (1) an expanded automated smoke test against a
  throwaway in-memory MongoDB — 13 cases covering signup, duplicate email,
  short password, login blocked at each stage, seed-admin bootstrap,
  expired-link purge, and both lazy-sweep-on-login cases; (2) a real
  end-to-end run against the actual Atlas cluster and Gmail account
  (`api/.env`'s real credentials) — signup persisted a real `AuthUser`,
  verification email genuinely delivered (Gmail accepted it, `250 OK`),
  verify/login/session all behaved correctly, and the test account was
  deleted afterward. No browser automation was available this session, so
  the actual UI click-through in a browser is still worth doing by hand.

## Current state by file (Phase A3 — Admin approvals & admin management)

- **`api/controllers/adminController.js`** / **`api/routes/adminRoutes.js`**
  — mounted at `/admin`, every route behind `requireAdmin` (`router.use`):
  - `GET /admin/pending-users` — verified-but-unapproved users. Runs the
    2-week approval-expiry sweep across all of them first (`purgeIfExpired`
    from `api/utils/accountExpiry.js`) — this page load is one of the two
    trigger points `prd.md` §3.2 names for that clock (the other is a login
    attempt, already wired into `authController.login` in Phase A2).
  - `POST /admin/users/:id/approve` — sets `is_approved`/`approved_at`.
  - `POST /admin/users/:id/reject` — deletes the account immediately and
    silently, per `prd.md` §3.2 (no notification either way).
  - `GET /admin/users` — every member, for the management view.
  - `PATCH /admin/users/:id/admin-status { is_admin }` — promote/demote.
    Blocked with `403 seed_admin_protected` if the target `is_seed_admin`
    (`prd.md` §3.3 — the seed admin can never be demoted by anyone).
  - `DELETE /admin/users/:id` — blocked the same way for the seed admin, and
    separately blocked (`403 use_self_delete`) if the target is the caller's
    own account — deleting yourself goes through the dedicated self-delete
    flow (Phase A6, requires re-entering your password), not this endpoint.
  - No deletion cascade logic here yet — `UserProfile` and Section B
    collections don't exist until later phases, so a plain
    `AuthUser.deleteOne()` is currently correct. Phase A6 extends this once
    there's something to cascade.
- **`src/components/RequireAdmin.jsx`** — wraps the two admin routes in
  `App.jsx`; calls `/auth/session` on mount and redirects non-admins to `/`.
  Belt-and-suspenders only — the backend's `requireAdmin` is the real gate,
  this just avoids flashing admin UI before that 403 would land.
- **`src/pages/admin/ApprovalsPage.jsx`** (`/admin/approvals`) — lists
  pending users with Approve/Reject; Reject goes through a `Modal`
  confirmation (not explicitly required by `prd.md` for this action, but
  added since it's an irreversible deletion, same reasoning as the
  explicitly-required confirmations elsewhere).
- **`src/pages/admin/AdminUsersPage.jsx`** (`/admin/users`) — lists every
  member with Promote/Demote and Delete, both disabled for the seed admin's
  row; Delete goes through a `Modal` confirmation (`prd.md` §3.6 explicitly
  requires this one). `HomePage` shows links to both pages when
  `session.state === 'admin'`.
- Verified two ways: (1) 17 cases against a throwaway in-memory MongoDB —
  permission boundaries (signed-out/non-admin/admin), the pending-list
  sweep, approve/reject, promote/demote, and every seed-admin/self-delete
  guard; (2) a live check against the real running backend + Atlas cluster
  using synthetic test accounts (not the real `ADMIN_EMAIL`), cleaned up
  after.
- **Operational note, not a code bug**: while testing this phase, repeated
  `TaskStop`+restart cycles on the backend left ~17 orphaned `node index.js`
  processes running in the background on this Windows machine (nodemon's
  child survived being "stopped"), and the stale one still bound to port
  4444 was serving pre-Phase-A3 code, which looked like a 404 routing bug
  until traced to the real cause. Cleaned up (with confirmation, since
  force-killing processes is destructive) — see the "Windows gotcha" note
  under "Running the app" above.

## Current state by file (Phase A4 — Password reset)

- **`api/utils/resetToken.js`** — same JWT-purpose-claim pattern as
  `verificationToken.js` (`purpose: 'reset_password'`), but a 1-hour TTL
  instead of 3 days, and no "purge on expiry" behaviour — unlike an unused
  signup, an expired reset link just means the user requests a new one, not
  that anything gets deleted.
- **`api/utils/mailer.js`** — added `sendPasswordResetEmail`/
  `buildResetLink`, same shape as the verification email helpers, pointing
  at `${FRONTEND_URL}/reset-password?token=...`.
- **`api/controllers/authController.js`** — added `forgotPassword` and
  `resetPassword`:
  - `POST /auth/forgot-password { email }` always responds
    `200 { message: 'check_inbox' }`, whether or not that email matches an
    account — this is deliberate (standard practice to avoid leaking which
    emails are registered), not something `prd.md` calls out explicitly.
    Works regardless of `email_verified`/`is_approved` — resetting a
    password is orthogonal to those gates, which `login` still enforces
    afterward regardless.
  - `POST /auth/reset-password { token, password }` — same
    `MIN_PASSWORD_LENGTH` (8) check as signup; `410 expired` / `400
    invalid_link` on a bad token, else sets the new password via the
    existing `user.password = ...` virtual/hashing hook.
- **`src/pages/ForgotPasswordPage.jsx`** (`/forgot-password`) and
  **`src/pages/ResetPasswordPage.jsx`** (`/reset-password?token=...`) — the
  request form and the set-new-password form. `ForgotPasswordPage` shows the
  same "check your inbox" message regardless of the API response, matching
  the backend's non-enumerating behaviour. `LoginPage` now links to
  `/forgot-password`.
- Verified two ways: 11 automated cases against an in-memory MongoDB
  (non-enumeration, successful reset + old password rejected + new password
  works, short password, garbage/expired token, reset working for an
  unverified user while login stays gated afterward), plus a live check
  against the real running backend and Atlas cluster.

## Current state by file (Phase A5 — Profile schema & completion flow)

- **`api/models/UserProfile.js`** — `prd.md` §3.1's `UserProfile`. One extra
  field beyond the PRD's table: `skill_prefill_used` (internal bookkeeping,
  not shown to the user) — needed to correctly implement the one-time-ever
  semantics of the skill→team auto-prefill rule (see below); without it,
  clearing skills back to empty and re-adding one could incorrectly
  re-trigger the suggestion.
- **`api/utils/ensureProfile.js`** — `ensureProfileExists(authUser)`, called
  from both approval paths (`adminController.approveUser` and the
  seed-admin auto-approve branch in `authController.verifyEmail`) so every
  approved member has exactly one `UserProfile` from the moment they're
  approved — `volunteer_since` set to `AuthUser.created_at` right there, per
  `prd.md` §3.1. This is what makes "on first login after approval, prompted
  to complete their profile" (§3.5) simple to detect later: an empty
  `teams` array (mandatory once set) is a reliable "not completed yet"
  signal, with no separate boolean needed.
- **`api/controllers/authController.js`** — `login` now also updates the
  caller's `UserProfile.last_login` (used later for the "recently active"
  computation in Phase A7's directory).
- **`api/utils/skillTeams.js`** (backend) / **`src/lib/skillTeams.js`**
  (frontend) — both derive the master team list from `config/skillTeams.json`
  independently (same reasoning as the JSON-not-JS choice in Phase 0: no
  build step needed to share it, so two thin per-runtime files instead of
  fighting the CJS/ESM boundary).
- **`api/controllers/profileController.js`** — `GET /profile/me` /
  `PUT /profile/me`, both behind `requireActiveMember`; there's no separate
  "complete" vs "edit" endpoint, just this one, used at different points in
  the lifecycle. `PUT` requires a non-empty `teams` array from the master
  list (mandatory, per §3.5), validates `profile_picture` against the 4
  presets, and rejects `about_me` over 200 characters or containing a link
  (`https?://` or `www.`) — a plain substring/regex check, not a full URL
  parser, matching "no links" literally rather than trying to be clever
  about it.
- **The skill→team auto-prefill rule (`prd.md` §3.5) is split across both
  layers on purpose**: it reads as an *interactive form suggestion* ("as a
  starting suggestion... free to remove/change it before saving"), so the
  actual prefill happens client-side in `src/components/ProfileForm.jsx`
  the moment the user's skill selection goes from empty to one entry (via
  either a checkbox or the free-text "Other" field, whichever happens
  first) — it fills in that skill's first mapped team into the *unsaved*
  form state, nothing is persisted yet. The backend's only job is tracking
  `skill_prefill_used` so this can never fire a second time, even in a
  later session, even if skills is cleared back to empty in between.
- **`api/controllers/adminController.js`** — `listUsers` now joins in each
  user's `is_key_player` from `UserProfile` (it doesn't live on `AuthUser`).
  New `PATCH /admin/users/:id/key-player { is_key_player }`, editable from
  the same admin Members view as promote/demote/delete, per build-plan's
  explicit placement of this control.
- **`src/components/ProfileForm.jsx`** — the single shared form (profile
  picture grid, skill checkboxes + free-text "Other" with removable tags,
  mandatory team checkboxes, Slack link + independent email/Slack visibility
  toggles, about-me with a live character counter) used by both:
  - `src/pages/CompleteProfilePage.jsx` (`/complete-profile`) — framed as
    first-time setup; saving navigates home.
  - `src/pages/EditProfilePage.jsx` (`/profile`) — framed as ongoing editing;
    saving shows an inline "Saved." message and stays on the page.
  Both are guarded by `RequireActiveMember` and reachable from `HomePage`'s
  new "My profile" link.
- **Routing to the completion flow**: `LoginPage` fetches the profile right
  after a successful login and redirects to `/complete-profile` if `teams`
  is empty, otherwise home; `HomePage` does the same check on load (so
  navigating back or refreshing after login still redirects correctly, not
  just the moment right after logging in).
- **Known gap, not a bug in this phase**: `adminController.deleteUser`
  (Phase A3) still only deletes the `AuthUser` document — now that
  `UserProfile` exists, deleting a user leaves their profile orphaned.
  `prd.md` §3.6 and build-plan Phase A6 explicitly assign "delete
  `AuthUser` + `UserProfile` together" to the dedicated deletion-cascade
  utility built in that phase, so this wasn't fixed here to stay in scope —
  flagging it now so Phase A6 doesn't miss that `UserProfile` cleanup is
  needed for *every* deletion path (self-delete, admin-delete, and the two
  lazy-expiry purges in `accountExpiry.js`), not just the ones involving
  Section B.
- Verified two ways: 16 automated cases against an in-memory MongoDB
  (approval auto-creates a profile with the right `volunteer_since`, login
  updates `last_login`, every validation rule, the prefill flag flipping
  once, the admin key-player toggle reflected in the user list, and the
  seed-admin bootstrap also creating a profile via the real `/verify-email`
  path), plus a live check against the real running backend and Atlas
  cluster.

## Current state by file (Phase A6 — Account deletion)

- **`api/utils/deleteAccount.js`** — `deleteUserAccount(userId)`, the single
  reusable deletion utility `prd.md` §3.6 and build-plan Phase A6 both call
  for: deletes the `AuthUser` and `UserProfile` pair together. Both
  `adminController.deleteUser` (Phase A3) and the new self-delete endpoint
  now route through this one function instead of each deleting `AuthUser`
  directly — this closes the orphaned-`UserProfile` gap flagged at the end
  of Phase A5. Section B's collections (`ProjectMember`, `IssueMember`,
  `Task.assigned_to`, `PollVote`) get added into this same function in
  Phase B6, once they exist — not a second cascade utility.
- **`api/controllers/profileController.js`** — new `DELETE /profile/me
  { password }`. Re-checks the password against `password_hash` (re-fetched
  with `.select('+password_hash')`, since `req.user` from the auth
  middleware never has it selected) before deleting anything. Blocked with
  `403 seed_admin_protected` if the caller is the seed admin — `prd.md`
  §3.3 says the seed admin can never be deleted "by anyone," which includes
  themselves, not just via the admin panel.
- **`src/components/DeleteAccountSection.jsx`** — the confirm-with-password
  UI, rendered on `EditProfilePage` (`/profile`) per `prd.md` §3.6 ("from
  their profile page"). Hidden entirely for the seed admin (checked via
  `/auth/session`'s `user.is_seed_admin`) — belt-and-suspenders on top of
  the backend's own guard, same pattern as `RequireAdmin`. On success,
  clears the local token and redirects home.
- Verified two ways: 13 automated cases against an in-memory MongoDB (wrong
  password rejected, missing password rejected, seed admin blocked from
  self-delete, correct password deletes both documents and the account can
  no longer log in, admin-delete now also removes the `UserProfile`, seed
  admin still protected from admin-delete), plus a live check against the
  real running backend and Atlas cluster.

## Current state by file (Phase A7 — Directory / Explore page)

**Section A is now feature-complete.** Sign up, verify, get approved,
complete a profile, browse/find each other, and every admin-management path
all work end to end.

- **`api/utils/recentlyActive.js`** — `isRecentlyActive(lastLogin)`, the
  live 3-day computation from `prd.md` §3.1 ("recency is not stored").
  Shared so the directory and any later screen that shows this (e.g. a
  future project member list) use the exact same rule.
- **`api/controllers/directoryController.js`** — two endpoints, both behind
  `requireActiveMember` (`prd.md` §3.7 — "visible to any approved member"):
  - `GET /directory/members` — every approved member's card-level info
    (name, `profile_picture`, `teams`, `is_key_player`, computed
    `recently_active`). `teams`/`is_key_player` aren't behind any visibility
    toggle, so they're always included — that's what the filter buttons
    operate on client-side.
  - `GET /directory/members/:id` — the full profile shown in the
    click-through modal. `email`/`slack_link` are `null` unless *that
    member's own* `email_visible`/`slack_visible` toggle is on. This
    deliberately does **not** apply the "admins can see everything"
    carve-out from `prd.md` §3.3 — that assumption is explicitly scoped to
    admin/approval screens (where it already holds structurally, since
    `AuthUser.email` is always in `toPublicJSON()`), not this general
    member-facing directory.
- **`src/pages/DirectoryPage.jsx`** (`/directory`) — fetches the full member
  list once and filters client-side (a "key players only" toggle plus
  single-select team buttons, per `prd.md` §3.7 — no name search box).
  Clicking a card fetches that member's full profile and shows it in a
  `Modal` (photo, teams, skills, about-me, email/Slack only if present,
  "Recently active" badge, volunteer-since date). Guarded by
  `RequireActiveMember` and linked from `HomePage`.
- Verified two ways: 13 automated cases against an in-memory MongoDB
  (signed-out/unapproved blocked, the approved-member list is correct and
  includes the viewer themselves, `recently_active` computed correctly for
  recent/stale/never-logged-in members, `teams`/`is_key_player` always
  visible, email/Slack correctly hidden or shown per that member's own
  toggles, an unapproved user's profile returns 404), plus a live check
  against the real running backend and Atlas cluster.

## Current state by file (Phase B1 — Core project data & status engine)

**Deliberate deviation from a strict "one model per its own phase" pattern**:
build-plan.md assigns the `Issue` model to Phase B3, `Task` to Phase B4, and
`Poll` to Phase B5 — but this phase's own demoable criterion ("checked by
manually creating/updating documents in Mongo and confirming derived status
updates as expected") is impossible to satisfy without those collections
actually existing and being queryable. So all three were created now, with
their full `prd.md` §4.1 field sets (nothing invented or guessed at) — but
**no routes, controllers, or validation logic for them**. Phases B3/B4/B5
add the actual add-issue/add-task/add-poll flows (permissions, input
validation, HTTP surface, frontend) on top of schemas that already exist and
are already correct; they are not redefining the models. `PollOption` and
`PollVote` were *not* created here — they don't affect status math, so they
stay entirely owned by Phase B5.

- **`api/models/Project.js`**, **`ProjectMember.js`**, **`ProjectTeam.js`**
  — exactly `prd.md` §4.1's field tables. `ProjectMember` and `ProjectTeam`
  each have a compound unique index (`project_id`+`user_id`,
  `project_id`+`team`) matching the PRD's "unique together" notes. Neither
  "at most one contact per project" nor "team must be from the master list"
  is enforced at the schema level — both are request-time business rules
  for Phase B2's controller to own, the same pattern already used for
  `UserProfile.teams` (validated in `profileController`, not the schema).
- **`api/models/Issue.js`**, **`Task.js`**, **`Poll.js`** — see the
  deviation note above. `status` on `Project`/`Issue` defaults to
  `not_started` and is otherwise **only ever written by
  `statusEngine.js`** — nothing else should ever set it directly. `Task`
  remains the one place status is set manually, per `prd.md` §4.1.
- **`api/utils/statusEngine.js`** — the shared status-derivation utility
  build-plan Phase B1 asks for, implementing `prd.md` §4.2's pseudocode
  exactly:
  - `calculateIssueStatus({ taskStatuses, pollCount })` /
    `calculateProjectStatus({ issueStatuses })` — pure functions, no
    database access, easy to unit-test in isolation.
  - `recalculateIssueStatus(issueId)` — reads that issue's current tasks
    and poll count fresh, recomputes, persists only if changed, then always
    cascades into `recalculateProjectStatus`. Every later phase that
    mutates a task's status or adds/removes a task or poll on an issue
    should call this one function — it's the single trigger point for the
    whole bottom-up cascade description in build-plan.md.
  - `recalculateProjectStatus(projectId)` — same idea one level up; called
    directly when an issue itself is added to or removed from a project
    (Phase B3), and internally by `recalculateIssueStatus`.
  - Because every recalculation re-reads all children from scratch rather
    than tracking state incrementally, "reopening" (a new task added to an
    already-Resolved issue, a new issue added to an already-Resolved
    project) needs no special-case code — it falls out of running the same
    calculation again.
- Verified two ways: 21 automated cases against an in-memory MongoDB,
  covering every pure-function branch and every "key behaviour" bullet
  point `prd.md` §4.2 lists explicitly (fresh containers start
  `not_started`; a poll alone moves an issue to `underway` but never
  resolves it, even once closed; an issue only resolves with ≥1 task all
  resolved; the cascade from a task's resolution up through its issue to
  its project; reopening an issue by adding a new task, and reopening a
  project by adding a new issue, both verified to cascade correctly) — plus
  a smaller live check of the same core cascade against the real Atlas
  cluster. No HTTP server was involved in either check, since none exists
  yet this phase — both created documents directly via the Mongoose models,
  matching this phase's own "no UI yet" demoable criterion.

## Current state by file (Phase B2 — Projects landing page & project lifecycle)

- **`api/controllers/projectController.js`** / **`api/routes/projectRoutes.js`**
  — mounted at `/projects`, base-gated by `requireActiveMember` (any
  approved member); several actions add a narrower "must currently be a
  `ProjectMember` of *this* project" check on top (via
  `isProjectMember.js`), matching `prd.md` §4.7's flat permissions model:
  - `GET /projects` — every project, self-serve/open per `prd.md` §4.3, with
    `member_count`/`issue_count`/`task_count` computed via aggregation
    (issues/tasks will correctly show 0 until Phase B3/B4 make them
    creatable).
  - `POST /projects { title, description }` — any approved member; creator
    becomes a `ProjectMember` with `role: 'contact'`.
  - `GET /projects/:id` — full header detail: contact (resolved to a
    name), team tags, member list, and `is_member` (so the frontend knows
    whether to show Join or the member-only controls).
  - `POST /projects/:id/join` — self-add; `409 already_member` on a
    duplicate (the unique index backs this up regardless).
  - `POST /projects/:id/leave` — self-remove only; delegates to
    `leaveProject()`.
  - `POST /projects/:id/teams` / `DELETE /projects/:id/teams` (`{ team }`
    in the body, not a URL param — a team name like "Business Development"
    would need encoding otherwise) — any current project member; add is
    idempotent (a duplicate-key error is treated as success, not an error).
  - `PATCH /projects/:id/contact { user_id | null }` — any current project
    member can reassign the purely-cosmetic contact label to any other
    current member, to themselves, or clear it; rejects a `user_id` that
    isn't currently a member of this project.
  - `DELETE /projects/:id { confirmText }` — any current project member,
    only once `status === 'resolved'`, only with the exact phrase
    `"delete project"`. Cascades via `deleteProjectCascade()`.
- **`api/utils/isProjectMember.js`** — the shared "any current project
  member" check every membership-scoped action above uses.
- **`api/utils/leaveProject.js`** — removes the `ProjectMember` row (which,
  as a side effect, silently clears the `contact` tag if they held it — no
  succession logic needed, per `prd.md`) and resets any of their assigned
  tasks in that project back to unassigned. **Known gap, flagged not
  fixed**: `prd.md` §4.3 also requires removing their `IssueMember` rows
  within the project's issues on leaving — `IssueMember` doesn't exist yet
  (it's Phase B3's model, unlike Issue/Task/Poll which were pulled forward
  in Phase B1 for the status engine). Nothing is lost in practice right
  now since Phase B3 hasn't shipped issue membership yet either — but
  Phase B3 must extend this function once it does, not write a second
  leave-project code path.
- **`api/utils/deleteProject.js`** — `deleteProjectCascade(projectId)`
  removes the project, its `ProjectMember`/`ProjectTeam` rows, and (looking
  ahead of what's actually creatable yet) any `Issue`/`Task`/`Poll`
  documents under it too — unlike the user-deletion cascade, a deleted
  project's issues/tasks have no "dangle and render as deleted" concept,
  they're just gone with it. `PollOption`/`PollVote` aren't touched yet
  since they don't exist until Phase B5, which should extend this function.
- **`src/pages/ProjectsPage.jsx`** (`/projects`) — the landing grid (title,
  `StatusBadge`, member/issue/task counts) plus a "+ New project" modal.
  Per `prd.md` §4.3 the card should also show member avatars; this was
  simplified to just the numeric count for this phase — a small, deliberate
  scope trim, not an oversight.
- **`src/pages/ProjectDetailPage.jsx`** (`/projects/:id`) — header, Join
  button (non-members) or the full member-only toolset: team tag checkboxes
  (reusing `MASTER_TEAM_LIST`, same pattern as `ProfileForm`), a member list
  with a contact-reassignment `<select>`, Leave (confirm modal, per
  `prd.md`), and Delete (only shown once resolved, gated by typing "delete
  project" exactly, per `prd.md`). No issues list yet — that's Phase B3,
  added directly onto this same page.
- **`src/components/StatusBadge.jsx`** — small shared pill for the three
  derived statuses; will be reused on issue and task cards in Phase B3/B4.
- Verified two ways: 32 automated cases against an in-memory MongoDB
  (permission boundaries for every membership-scoped action, join/leave
  including the assigned-task reset on leaving, idempotent team tag
  add/remove, contact reassignment and clearing, and the full
  not-resolved/wrong-phrase/success delete-project sequence with cascade
  verified down to zero remaining `Issue`/`Task` documents), plus a live
  check against the real running backend and Atlas cluster.

## Current state by file (Phase B3 — Issues)

This phase closed the `IssueMember` gap flagged at the end of Phase B2, in
addition to its own scope.

- **`api/models/IssueMember.js`** — `prd.md` §4.1, created now (rather than
  deferred like `Poll`/`PollOption` sometimes are) specifically because
  `leaveProject()`'s documented gap needed it. `leaveProject.js` and
  `deleteProject.js` (`deleteProjectCascade`) were both extended to clean
  up `IssueMember` rows — no gap remains there now.
- **`api/controllers/issueController.js`** — mounted two ways: `GET`/`POST
  /projects/:projectId/issues` (nested onto `projectRoutes.js`, alongside
  its existing `/:id/...` project actions — different param names on the
  same router don't conflict) for the list/create actions, and
  `/issues/:id`, `/issues/:id/members[/:userId]` (its own `issueRoutes.js`)
  for the rest:
  - `listIssues` — the collapsed-card data build-plan Phase B3 asks for:
    `status`, `task_resolved`/`task_total`, `people_count`. Viewing is
    self-serve/open like projects — no membership check, matching how
    `getProject` already works.
  - `createIssue` — any *project* member (checked via `isProjectMember`);
    creator is auto-added as an `IssueMember`; calls
    `recalculateProjectStatus` afterward since a fresh issue moves the
    project from `not_started` to `underway` (prd.md §4.2, already verified
    in Phase B1's smoke test — this phase just exercises that real trigger
    point for the first time).
  - `getIssue` — the expanded view: description, resolved member names,
    task counts. Also self-serve/open to view.
  - `addIssueMember` / `removeIssueMember` — per `prd.md` §4.7's flat
    permissions, *any current project member* can add or remove *any*
    person (not restricted to acting on themselves, unlike leaving a
    project) — the only requirement is that the target is already a
    project member (issue membership is a subset of project membership,
    never automatic). Adding is idempotent on a duplicate.
- **`src/components/IssueCard.jsx`** — the collapsed card; clicking expands
  it in place (no navigation, per `prd.md` §4.4's literal wording) and
  lazy-loads the full detail via `GET /issues/:id` only on first expand,
  same pattern `DirectoryPage` already uses for its profile modal. Ends
  with an italicized "Tasks and polls are coming in the next update" line —
  build-plan Phase B3 explicitly calls for a placeholder here, so this one
  (unlike most of this codebase's stance on not adding not-yet-real UI) is
  spec-requested, not scope creep.
- **`src/pages/ProjectDetailPage.jsx`** — gained an "Issues" section
  (visible to any viewer, "+ Add issue" only shown to current project
  members) between the project header and the team-tags/members/actions
  block, matching `prd.md` §4.3's stated page order ("header ... then the
  Issues list").
- Verified two ways: 18 automated cases against an in-memory MongoDB
  (permission boundaries for create/add-person/remove-person, the
  project-status cascade on issue creation, idempotent re-adding, the flat
  "anyone can remove anyone" permission for issue membership, and —
  extending Phase B2's own tests — that leaving a project now also removes
  `IssueMember` rows and that deleting a project cascades to remove them
  too), plus a live check against the real running backend and Atlas
  cluster.

## Current state by file (Phase B4 — Tasks)

`deleteProjectCascade()` was also extended this phase to remove `TaskLink`
rows (previously an oversight — deleting a project deleted its `Task`
documents but would have orphaned their links).

- **`api/controllers/taskController.js`** — mounted two ways, same pattern
  as issues: `GET`/`POST /issues/:issueId/tasks` (nested onto
  `issueRoutes.js`) for list/create, and `/tasks/:id/...` (its own
  `taskRoutes.js`) for the rest:
  - `listTasks` — resolves `assigned_to`/`resolved_by` to `{id, first_name,
    last_name}` (falling back to "Deleted user" per `prd.md` §3.6's
    convention, reused here even though no deletion cascade touches tasks
    yet), and includes each task's `TaskLink`s inline — no separate
    per-task fetch needed, unlike the lazy issue-detail/directory-profile
    pattern used elsewhere, since a task's full data is cheap enough to
    return with the list.
  - `createTask` — any project member; `assigned_to` (if given) must be a
    current project member, but per `prd.md` §4.5 explicitly does **not**
    need to already be an `IssueMember` — assigning someone a task doesn't
    add them to the issue. Triggers `recalculateIssueStatus`.
  - `assignTask` / `setTaskStatus` — reassignment and non-terminal status
    changes (`not_started`/`underway` only — `setTaskStatus` rejects
    `'resolved'` outright). Both blocked once a task is `'resolved'`
    (`400 already_resolved`) — resolution is a one-way door, no edit/reopen
    in v1, per `prd.md` §4.5.
  - `resolveTask` — the mandatory-note flow: rejects an empty/whitespace-only
    resolution, sets `status`/`resolution`/`resolved_by`/`resolved_at`
    together, then calls `recalculateIssueStatus` — this is the trigger
    point for this phase's whole demoable scenario (resolving every task on
    an issue cascades it to `resolved`, which cascades the project too).
  - `addTaskLink` — validated with `new URL(...)` (rejects anything not
    URL-shaped); deliberately *not* blocked on a resolved task — links are
    supplementary attachments, not part of the immutable resolution record
    itself.
- **`src/components/TaskRow.jsx`** — per-task controls inside an expanded
  `IssueCard`: an assignment `<select>` (Not assigned / Assign to me / any
  other project member, matching `prd.md` §4.5's three-way framing) and a
  status `<select>` (both hidden once resolved, replaced by the read-only
  resolution + who/when), a "Resolve" button opening a `Modal` with the
  mandatory textarea, and an inline add-link form.
- **`src/components/IssueCard.jsx`** — gained a Tasks section (lazy-loaded
  alongside the issue detail on first expand, same trigger) with a
  "+ Add task" modal offering the same three-way assignment choice at
  creation time. The "polls are coming" placeholder line remains (Phase B5).
- **`src/pages/ProjectDetailPage.jsx`** — now fetches the current session's
  user once (via `fetchSession`) and threads it down through `IssueCard` to
  `TaskRow`, purely so "Assign to me" can be offered without the user
  having to find themselves in a member list.
- **Operational note**: hit the same Windows nodemon-restart issue
  documented under "Running the app" again this phase — this time only two
  stale processes (not the ~20-process pile from before), confirming the
  earlier cleanup held and this is a per-restart risk, not a
  runaway-accumulation one. Cleaned up the same way.
- Verified two ways: 30 automated cases against an in-memory MongoDB
  (permission boundaries for every task action, assignment validation
  against project membership, the resolved-task immutability guard across
  reassignment/status-change/double-resolve, link URL validation, and this
  phase's centerpiece — resolving the last task on an issue cascades the
  issue to resolved and, since it was the project's only issue, the project
  too), plus a live check against the real running backend and Atlas
  cluster.

## Current state by file (Phase B5 — Polls)

**Section B's core loop is now feature-complete end to end**: create a
project, add an issue, discuss via a poll, spin up tasks, resolve them, and
watch status roll all the way up to the project — exactly this phase's
demoable criterion, verified live against Atlas (see below). `IssueCard`'s
placeholder line is gone; nothing in Section B is stubbed out anymore.

`deleteProjectCascade()` was extended to remove `PollOption`/`PollVote` rows
too, closing the gap flagged since Phase B2.

- **`api/controllers/pollController.js`** — mounted two ways, same pattern
  as issues/tasks: `GET`/`POST /issues/:issueId/polls` (nested onto
  `issueRoutes.js`) for list/create, and `/polls/:id/...` (its own
  `pollRoutes.js`) for the rest:
  - `listPolls` — each option carries a live `vote_count` and
    `voted_by_me` (computed from `PollVote`, not stored), so the frontend
    can render toggle state without a second round trip.
  - `createPoll` — any project member; requires at least one non-empty
    initial option (`prd.md` says "question + initial options" but doesn't
    state a minimum — one felt like the only sensible floor for something
    voteable). A poll's mere existence moves the issue from `not_started`
    to `underway` even with zero tasks (`prd.md` §4.2), so
    `recalculateIssueStatus` runs here — this is the one poll action that
    touches status at all.
  - `addPollOption` — any project member, any time — but only while the
    poll is still open. `prd.md` doesn't explicitly state this edge case,
    but "closed = final result" only makes sense if the option set is also
    frozen, so a closed poll rejects new options (`400 poll_closed`).
  - `toggleVote` — inserts or deletes a single `(poll, option, user)` row;
    rejected once the poll is closed. Multi-select falls out naturally from
    the schema (no `(poll, user)` uniqueness) — verified in this phase's
    smoke test by having one user hold votes on two options simultaneously.
  - `closePoll` — any project member, not just the creator; rejects a
    second close (`400 already_closed`). Deliberately does **not** call
    `recalculateIssueStatus` or touch status in any way — `prd.md` §4.6 is
    explicit that closing a poll never changes issue/project status by
    itself, purely informational.
- **`src/components/PollCard.jsx`** — each option renders as a toggleable
  button (vote count + a highlighted state when `voted_by_me`); once closed,
  the buttons become inert and show the frozen final tally. An inline
  "add option" form and a "Close poll" button both disappear once closed.
- **`src/components/IssueCard.jsx`** — gained a Polls section (lazy-loaded
  alongside issue detail/tasks on first expand) with a "+ Add poll" modal —
  a question field plus a dynamic list of option inputs (starts with two,
  "+ Add another option" appends more; empty ones are filtered out on
  submit, at least one non-empty required client-side to match the backend).
- Verified two ways: 23 automated cases against an in-memory MongoDB
  (permission boundaries for every poll action, the options-required
  minimum, multi-select voting including toggling a vote back off, voting
  for a nonexistent option rejected, the open/closed state machine for
  adding options and voting, double-close rejected, and — critically —
  confirming closing a poll leaves issue status completely unchanged), plus
  a live check against the real running backend and Atlas cluster that
  walks the *entire* Section B loop end to end (create project → add issue
  → poll → vote → close → add task → resolve → issue resolved → project
  resolved), matching this phase's demoable criterion exactly.

## Current state by file (Phase B6 — Deletion cascade completion)

**This is the last content phase in `build-plan.md`** — everything through
Section B (§4 of `prd.md`) is now built. Only Phase F (a final cross-cutting
polish pass — permissions audit, empty/error states, responsive polish; no
new features) remains.

- **`api/utils/deleteAccount.js`** — `deleteUserAccount(userId)` extended
  to sweep every live relationship the deleted user held **account-wide**
  (not scoped to one project, unlike `leaveProject()` — a person can be a
  member of many projects at once): removes all their `ProjectMember` and
  `IssueMember` rows across every project/issue, nulls `Task.assigned_to`
  wherever it pointed at them, and removes all their `PollVote` rows.
  Historical `created_by`/`resolved_by` fields are untouched everywhere,
  per `prd.md` §3.6.
  - Both `adminController.deleteUser` and `profileController.deleteMyAccount`
    already called this one shared function (established back in Phase
    A6), so neither needed any change — they get the full Section B
    cascade automatically, which is the whole point of routing both
    deletion paths through a single utility instead of duplicating logic.
  - The two lazy-expiry purges in `accountExpiry.js` deliberately still
    call `AuthUser.deleteOne()` directly rather than this function — not an
    oversight. An unverified or unapproved account can never have joined a
    project (every Section B route requires `requireActiveMember`), so
    there is structurally nothing for this cascade to clean up in that case.
  - **Correction to a note from Phase B5's write-up**: it claimed the
    "Deleted user" fallback was rendered in `projectController`,
    `issueController`, *and* `taskController`'s responses. On closer look
    while auditing this phase, only `taskController.listTasks` actually
    does — `projectController`/`issueController` never expose
    `created_by` at all (a deleted member simply vanishes from a
    project/issue's member list once their `ProjectMember`/`IssueMember`
    row is gone, which is correct — there's no "Deleted user" placeholder
    to show in a membership list). `Task.resolved_by`/`assigned_to` remain
    the one place in the app where a dangling reference is actually
    displayed, and that fallback was already built correctly back in Phase
    B4.
- Verified two ways: 20 automated cases against an in-memory MongoDB,
  matching this phase's demoable criterion directly — a user with
  `ProjectMember`/`IssueMember` rows, a task assignment, a resolved task
  (`resolved_by` pointing at them), and a poll vote, spread across *two*
  separate projects, is deleted; every live relationship is confirmed
  cleaned up, historical attribution is confirmed left untouched, an actual
  HTTP call confirms no crash and the correct "Deleted user" fallback
  rendering, and a second ("bystander") user's own memberships/assignments/
  votes are confirmed completely unaffected — plus a live check of the same
  scenario against the real Atlas cluster.
- **Testing-hygiene note, not a product bug**: this phase's live-check
  found one leftover orphaned `IssueMember` document sitting in Atlas from
  Phase B4's own live-check cleanup (creating an issue via the API
  auto-adds an `IssueMember` row for its creator, which that phase's
  cleanup script forgot to also delete). Confirmed it was harmless test
  debris — both documents it referenced no longer existed — and removed it.
  Every collection is now confirmed at 0 documents in Atlas.

## Current state by file (Phase F — Final pass)

**This is the last phase in `build-plan.md`. The app now implements
`prd.md` in full**, ready for manual testing by the app owner. No new
features were added this phase — it was purely an audit-and-fix pass, per
build-plan's own framing.

- **Permissions audit** (backend + frontend, read don't guess): grepped
  every controller and route file for `is_admin`/`is_seed_admin`/
  `role === 'contact'` usage. Confirmed `requireAdmin` is applied only to
  `adminRoutes.js` (plus the Phase A1 demo route) and never leaks into any
  Section B route; confirmed every Section B controller gates its
  project-scoped actions on `isProjectMember`, never on role or admin
  status; confirmed `role === 'contact'` is used only for display (resolving
  who to label "Contact"), never as a permission check anywhere — matching
  `prd.md` §4.3's "leadership carries no permissions" exactly. No gating
  bugs found on the backend.
- **Frontend permissions gap found and fixed**: `IssueCard`, `TaskRow`, and
  `PollCard` never checked project membership at all — a non-member
  browsing a project (viewing is intentionally self-serve/open) saw fully
  interactive "+ Add task"/"+ Add poll"/"Add person"/assign/status/resolve/
  vote/close controls that the backend correctly rejected, but only with a
  generic error rather than the controls simply not being there. Threaded
  an `isMember` prop down from `ProjectDetailPage`'s `project.is_member`
  through `IssueCard` → `TaskRow`/`PollCard`; non-members now see read-only
  equivalents (assignee name instead of the assign `<select>`, vote counts
  instead of clickable buttons, etc.) instead of dead-end interactive
  controls.
- **Display gap found and fixed**: a project's team tags — part of the
  header per `prd.md` §4.3, visible to any viewer — were only rendered
  inside `ProjectDetailPage`'s member-only block, so a non-member couldn't
  see a project's tags at all before joining. Added a read-only tag-pill
  display in the always-visible header area; the existing checkbox editor
  (member-only) is now purely the edit control layered underneath it.
- **Error-state gaps found and fixed**:
  - `DirectoryPage`'s member-detail modal silently set the detail to `null`
    on a failed fetch, leaving the modal stuck on "Loading…" forever with
    no indication anything went wrong. Now shows an error message instead.
  - `EditProfilePage` and `CompleteProfilePage` had **no `.catch()` at all**
    on their initial profile fetch — a failure would have left the page
    stuck on "Loading…" indefinitely (plus an unhandled promise rejection
    in the console). Both now catch and display an error.
  - `AdminUsersPage` was missing an empty-state message for a zero-member
    list (practically unreachable, since the seed admin always exists, but
    fixed for completeness — this phase's charge was explicitly "across all
    screens").
- **Responsive pass**: audited every grid/row layout for overflow risk on
  narrow viewports. Most layouts were already safe (`repeat(auto-fill,
  minmax(...))` grids, or already had `flex-wrap`). Added missing
  `flex-wrap` to header/action rows that could overflow with several
  fixed-width buttons alongside other content: `AdminPages.css`'s
  `.admin-row` (up to 3 action buttons per row), `HomePage.css`'s
  `.home-card__actions` (up to 5 buttons for an admin), plus
  `ProjectDetailPage.css`'s header/actions rows, `ProjectsPage.css`'s
  header row, and `IssueCard.css`'s tasks/polls section headers, for
  consistency. Confirmed `Modal`/`PageShell` were already responsive
  (percentage width with a `max-width` cap, appropriate padding). No
  browser was available this session to visually confirm these at actual
  narrow widths — this was a CSS-review pass, not a tested one; worth a
  quick manual check in a real browser at some point.
- Verified via `npm run build` and `npm run lint` after every change in
  this phase (both clean throughout) — no new backend logic was added, so
  no smoke/live-check scripts were needed this phase.

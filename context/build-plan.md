# Cherry Volunteer Organiser — Build Plan

Companion to `prd.md`. Ordered so each phase is independently usable/demoable before moving on. Section A (users/accounts/profiles) is built first, in full, before any of Section B. No automated tests are included in this plan — verification is manual throughout.

---

## Phase 0 — Project foundations

- Scaffold the Next.js app (App Router), deployed target Vercel Hobby.
- Set up MongoDB Atlas connection + Mongoose (or native driver) connection helper suited to serverless (cached connection across invocations).
- Env vars: `MONGODB_URI`, `ADMIN_EMAIL`, `AUTH_SECRET`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`.
- Base design system: colour palette, typography, spacing scale, and core layout primitives (page shell, card, button, form field, modal) referencing cherry.org.uk's visual tone. Every later phase builds on these primitives instead of styling ad hoc.
- `config/skillTeams.js` — the skill→team mapping from `prd.md` §3.5, exported for reuse across signup/profile and the directory filters.

**Demoable at end of phase:** empty Next.js app deployed to Vercel, connected to Atlas, design tokens visible on a placeholder page.

---

## Section A — Users, Accounts & Profiles

### Phase A1 — Auth foundation

- `AuthUser` Mongoose model (per `prd.md` §3.1), password hashing via bcrypt on save, `password_hash` excluded from default queries.
- Auth.js configured with a Credentials provider backed by `AuthUser`, JWT session strategy.
- Middleware/route protection helper that reads session state and can distinguish: signed out / unverified / unapproved / active member / admin.

**Demoable:** a seeded test user can be created directly in Mongo and log in; protected route redirects work.

### Phase A2 — Signup, verification, approval lifecycle

- Signup form (email, first name, last name, password) → creates `AuthUser`.
- Verification email sender (Gmail/nodemailer) with a signed, time-limited token/link.
- Verification route: valid + within 3 days → mark verified; expired → delete the account and show an "expired, please sign up again" message.
- "Check your inbox" and "Waiting for admin approval" holding screens, shown based on session state.
- Seed-admin bootstrap logic: on verification, if `email === ADMIN_EMAIL`, set `is_admin`, `is_seed_admin`, `is_approved` immediately (skip the approval wait).
- Lazy 2-week approval-expiry sweep, run at the top of the Approvals page load (Phase A3) and on login attempts for pending accounts.

**Demoable:** full signup → verify → (auto-admin or pending) flow works end to end against real email.

### Phase A3 — Admin approvals & admin management

- Admin-only Approvals page: lists verified-but-unapproved users, Approve/Reject actions. Reject deletes the account immediately, no notification.
- Admin-only user management view: promote/demote `is_admin` (blocked for the seed admin), delete any user account (confirm dialog).
- Route guard so non-admins can't reach either page.

**Demoable:** admin can approve/reject a real pending signup; can promote a second admin; seed admin is protected from demotion/deletion.

### Phase A4 — Password reset

- "Forgot password" request form → emailed reset link (same transport as verification) → set-new-password form.

**Demoable:** a user can recover access without admin involvement.

### Phase A5 — Profile schema & completion flow

- `UserProfile` model (per `prd.md` §3.1).
- "Complete your profile" flow triggered on first login after approval: skills (multi-select + free-text "Other"), team (multi-select, mandatory, with the one-time auto-prefill rule from §3.5), profile picture (preset picker from `/assets/images/profile-pictures/`), Slack link + independent email/Slack visibility toggles, about-me (200 char cap, plain text).
- Profile edit page reachable any time afterward, same fields.
- `is_key_player` toggle, admin-only, editable from the admin user-management view (Phase A3) or the profile itself when viewed as admin.

**Demoable:** a newly approved user is walked through profile setup and can edit it later; skill→team prefill works once, correctly.

### Phase A6 — Account deletion

- Self-delete: confirm step requiring password re-entry, deletes `AuthUser` + `UserProfile`.
- Admin-delete: confirm dialog, same underlying deletion.
- Deletion cascade utility implementing `prd.md` §3.6 (live relationships cleaned up, historical `created_by`/`resolved_by` left dangling and rendered as "Deleted user"). Section B references/extends this in Phase B6 once those collections exist — for now it only needs to handle what exists in Section A (nothing in Section A itself dangles, so this phase just needs the base deletion to work correctly; the cascade parts activate once Section B ships).

**Demoable:** a user can delete their own account; an admin can delete anyone's; the seed admin cannot be deleted.

### Phase A7 — Directory / Explore page

- Member card grid, "Key players only" toggle, one filter button per master team, no search box.
- Live "recently active" computation (last 3 days) rendered per card/profile, not stored.
- Click-through modal showing full profile, respecting the viewed member's visibility toggles.

**Demoable:** Section A is feature-complete — sign up, verify, get approved, build a profile, find each other in the directory, admin manages approvals/admins/deletions.

---

## Section B — Projects, Issues, Tasks & Polls

### Phase B1 — Core project data & status engine

- `Project`, `ProjectMember`, `ProjectTeam` models (`prd.md` §4.1).
- Shared status-derivation utility implementing `calculateIssueStatus` / `calculateProjectStatus` (§4.2), triggered after any relevant mutation, cascading bottom-up (task change → recalc its issue → recalc its project).

**Demoable:** no UI yet — status engine correctness can be checked by manually creating/updating documents in Mongo and confirming derived status updates as expected.

### Phase B2 — Projects landing page & project lifecycle

- Landing page: card per project (title, member count, issue/task counts, status), "+ New project" button.
- Create-project flow; creator becomes `ProjectMember` with `role: 'contact'`.
- Project detail page header: title, description, contact person, member count, team tags.
- Join project (self-add) / Leave project (self-remove, "are you sure" confirm, triggers the membership+assignment cleanup from `prd.md` §4.3).
- Team tag management (any current member can add/remove `ProjectTeam` rows) and contact-person reassignment (any member, purely cosmetic).
- Delete-project flow: enabled only when `status === resolved`, gated by typing "delete project" to confirm.

**Demoable:** projects can be created, joined, left, tagged with teams, and deleted once resolved.

### Phase B3 — Issues

- Add-issue flow (title, description) on the project page; creator auto-added as `IssueMember`.
- Collapsed issue cards on the project page (status, x/y tasks, people count).
- Expanded issue view: description, people (+ Add person from project membership), placeholders for the polls and tasks sections built in the next two phases.

**Demoable:** issues can be created and browsed within a project; status shows `not_started` correctly with nothing under them yet.

### Phase B4 — Tasks

- `Task`, `TaskLink` models.
- Add-task flow within an expanded issue: name, description, links, assignment (Not assigned / Assign to me / Assign to any current project member — validated against project membership).
- Task row/expand view within the issue: description, links, current status, Resolve action.
- Resolve modal: mandatory resolution textarea; on submit sets `status`, `resolution`, `resolved_by`, `resolved_at`, then recalculates the parent issue's (and in turn the project's) status.

**Demoable:** the full task lifecycle works, and resolving every task on an issue flips it to Resolved automatically, which flips the project too if it was the last open issue.

### Phase B5 — Polls

- `Poll`, `PollOption`, `PollVote` models.
- Create-poll flow within an expanded issue (question + initial options).
- Add-option (any project member, any time), vote (toggle per option, multi-select, changeable), close-poll (any project member).
- Poll display: live vote counts while open, final tally once closed. Confirm a poll never affects issue/project status directly — only adding it flips `not_started` → `underway` per §4.2.

**Demoable:** Section B is feature-complete end to end — create a project, add an issue, discuss via a poll, spin up tasks, resolve them, watch status roll all the way up to the project.

### Phase B6 — Deletion cascade completion

- Extend the Phase A6 deletion utility to cover the Section B collections that now exist: remove `ProjectMember`/`IssueMember` rows, null out `Task.assigned_to`, remove `PollVote` rows for the deleted user; leave `created_by`/`resolved_by` across `Project`/`Issue`/`Task`/`TaskLink`/`Poll`/`PollOption` dangling and rendered as "Deleted user" wherever displayed.

**Demoable:** deleting a user who has activity across several projects leaves everything in a clean, correctly-labelled state — no orphaned memberships, no broken assignments, no crashes on dangling `created_by`.

---

## Phase F — Final pass

- Cross-cutting permissions audit: confirm every Section B action is available to any current project member with no leftover lead-only gating, and that Section A's admin-only actions are properly fenced off.
- Empty-state and error-state pass across all screens (empty directory filter results, a project with no issues, an issue with no tasks/polls yet, failed form submissions).
- Responsive/layout polish pass against the cherry.org.uk-inspired design system established in Phase 0, applied consistently across both sections.

**Demoable:** the whole app, as specified in `prd.md`, ready for manual testing by the app owner.

# Cherry Volunteer Organiser — Product Requirements Document

## 1. Overview

A volunteer organiser web app for Cherry. It has two halves:

- **Section A — Users, Accounts & Profiles.** Admin-gated signup, email verification, member profiles, and a directory so volunteers can find each other.
- **Section B — Projects, Issues, Tasks & Polls.** A lightweight project-management layer that turns problems into decisions (polls) and actionable work (tasks), without becoming a full Jira/Asana/Trello clone.

Styling takes visual cues from [cherry.org.uk](https://cherry.org.uk/) — not a literal clone, just tone/colour/type reference. Layout should be clean, uncluttered, and organised.

## 2. Platform & Technical Constraints

- **Hosting:** Vercel, Hobby (free) tier, backend integrated as serverless functions/API routes in the same Next.js app. This means:
  - No persistent background workers or long-running processes.
  - Function execution has a short timeout — avoid heavy synchronous work in a single request.
  - Time-based cleanup (expired signups, etc.) is done **lazily** — checked on-demand at the moment it's relevant (e.g. when the admin opens the approvals page, or when a user hits a verification/login route) — not via a scheduled cron job.
- **Database:** MongoDB Atlas (free tier).
- **Auth:** Auth.js, using a JWT session strategy (no server-side session store needed — fits serverless). Passwords hashed with bcrypt before storage; the password field is never selected/returned by default queries and never logged.
- **Email:** Gmail account + app password (nodemailer-style), used only for the sign-up verification email and password-reset email.
- **Images:** No Cloudinary, no user-uploaded photos. Profile pictures are chosen from a fixed set of preset images bundled in the frontend (`/assets/images/profile-pictures/`).
- **Testing:** Out of scope for this build — the app owner tests manually.

## 3. Section A — Users, Accounts & Profiles

### 3.1 Data model

Two collections, deliberately split: one minimal auth record, one richer profile record, linked by `user_id`.

**`AuthUser`** (the credentials/identity record)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `email` | String | unique |
| `password_hash` | String | bcrypt, `select: false` |
| `first_name` | String | |
| `last_name` | String | |
| `email_verified` | Boolean | default `false` |
| `email_verified_at` | Date \| null | |
| `is_approved` | Boolean | default `false` |
| `approved_at` | Date \| null | |
| `is_admin` | Boolean | default `false` |
| `is_seed_admin` | Boolean | default `false` — true only for the account matching `ADMIN_EMAIL`; see §3.3 |
| `created_at` | Date | |

**`UserProfile`** (the rich profile record)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `user_id` | ObjectId | ref `AuthUser`, unique |
| `volunteer_since` | Date | = `AuthUser.created_at` at signup; editable directly in Mongo by the admin for legacy members |
| `profile_picture` | String | filename/key of a preset image |
| `skills` | [String] | multi-select from the master skill list (see §3.5), plus free-text "Other" entries |
| `teams` | [String] | multi-select from the master team list (see §3.5); this is the single, unified "team" concept used both as the member's own identity *and* for `ProjectTeam` tagging in Section B |
| `email_visible` | Boolean | default `false` — independent toggle |
| `slack_link` | String | |
| `slack_visible` | Boolean | default `false` — independent toggle |
| `about_me` | String | plain text, max 200 characters, no links — "what you can reach out to me about" |
| `last_login` | Date | |
| `is_key_player` | Boolean | default `false`, admin-settable only, no cap on how many members can hold it |

Recency ("recently online") is **not stored** — it's computed live wherever a profile is rendered: `last_login` within the last 3 days ⇒ show "Recently active"; otherwise show nothing. This avoids a stale flag going out of sync.

### 3.2 Signup, verification & approval lifecycle

```
Sign up (email, first name, last name, password)
        │
        ▼
AuthUser created — email_verified=false, is_approved=false
Verification email sent
        │
        ▼
"Check your inbox" holding screen
        │
        ▼
User clicks verification link
        │
   ┌────┴─────────────────────────────┐
   │ within 3 days of created_at?     │
   └────┬─────────────────────────┬───┘
      yes                         no
        │                         │
        ▼                         ▼
email_verified=true      Account deleted from Mongo.
email_verified_at=now    Link is dead. No resend —
        │                 user must sign up again
        ▼                 from scratch.
"Waiting for admin
 approval" holding screen
        │
        ▼
Admin reviews in Approvals page
   ┌────┴─────────────────┐
   │                       │
Approve                 Reject
   │                       │
   ▼                       ▼
is_approved=true      Account deleted immediately,
approved_at=now        silently — no notification
   │                    email, no strike-counting,
   ▼                    no permanent email block —
User can log in         they're free to sign up again.
and is prompted to
complete their profile
```

**Two independent expiry clocks, both enforced lazily (checked opportunistically, not via cron):**
- **3 days** from `created_at` to click the verification link. If exceeded, the account is purged the next time anything touches it (link click, or a lazy sweep).
- **2 weeks** from `email_verified_at` to admin approval. If exceeded, the account is purged the next time the admin's Approvals page loads (sweep pending accounts for ones past deadline before rendering the list) or the user attempts to log in.

Neither expiry produces a notification — the account just silently disappears, same as an admin rejection.

### 3.3 Admin

- Admin-ness is a plain boolean (`is_admin`) on `AuthUser` — no tiered roles.
- **Bootstrap:** there is no separate admin setup flow. The very first admin signs up through the normal flow. The backend compares the signup email to `ADMIN_EMAIL` (env var); on a match, that account is flagged `is_seed_admin=true`, `is_admin=true`, and is auto-approved the moment it verifies its email — it skips the "waiting for approval" step entirely (there's no other admin yet to approve it).
- The seed admin (matching `ADMIN_EMAIL`) can **never** be demoted or deleted, by anyone, through the UI — a hard guard in the promote/demote and delete-user code paths. This prevents the org from ever being left with zero admins.
- Any admin can promote or demote any *other* user's `is_admin` flag via a simple toggle. No additional safeguards beyond the seed-admin protection (explicitly out of scope for v1).
- Admins have a dedicated **Approvals** page (admin-only route) listing verified-but-unapproved users, with Approve/Reject actions. This is also where the lazy 2-week expiry sweep runs.
- Assumption: admins can see a member's email and Slack link regardless of that member's visibility toggles (needed for admin/approval purposes). Flag if this should instead respect the toggle even for admins.

### 3.4 Login, sessions & password reset

- Auth.js, JWT session strategy, credentials provider backed by `AuthUser` + bcrypt comparison.
- Login is blocked (redirected to the relevant holding screen) unless `email_verified` and `is_approved` are both true.
- Forgot-password is in scope for v1: request → emailed reset link → set new password. Standard token-based flow, same email transport as verification.

### 3.5 Profile fields & the skills → team mapping

On first login after approval, the user is prompted to complete their profile. They can return to edit it at any time afterward.

- **Skills:** multi-select from a master list, plus a free-text "Other" option for anything not listed. The master list is `Object.keys(skillTeams)` from a config file (see below).
- **Team:** multi-select from the master team list (`skillTeams`'s union of values — 27 entries, e.g. Engineering, Marketing, Finance, Operations, Legal, etc.). This field is mandatory, has no free-text option, and is the *same* concept used for the directory filter (§3.7) and for tagging which teams are involved in a project (§4.1).
- **Auto-prefill rule:** the very first time a user adds a skill (their `skills` array goes from empty to one entry), if that skill exists in the `skillTeams` mapping *and* their `teams` array is still empty, auto-populate `teams` with that skill's first listed team as a starting suggestion. If their only/first skill is a free-text "Other" entry, there's nothing to prefill from. This only ever fires once, on that first addition — after that, the member is free to add or remove any team from the full master list with no further constraint (override is not limited to teams tied to their chosen skills).
- **Role/team mapping config** — kept in its own file so it can be edited independently of the schema/logic:

```js
// config/skillTeams.js
const skillTeams = {
  "software engineering": ["Engineering", "IT", "Product"],
  "crm": ["Sales", "Marketing", "Customer Success"],
  "project management": ["Operations", "Engineering", "Product", "Marketing"],
  "data analysis": ["Data", "Finance", "Marketing", "Operations", "Product"],
  "sales": ["Sales", "Business Development", "Customer Success"],
  "customer service": ["Customer Support", "Customer Success", "Operations"],
  "marketing": ["Marketing", "Sales", "Product"],
  "copywriting": ["Marketing", "Communications", "Content"],
  "graphic design": ["Design", "Marketing", "Product", "Brand"],
  "product management": ["Product", "Engineering", "Design", "Marketing"],
  "business development": ["Business Development", "Sales", "Partnerships", "Strategy"],
  "financial analysis": ["Finance", "Strategy", "Operations"],
  "accounting": ["Finance", "Operations"],
  "operations management": ["Operations", "Finance", "Customer Success", "Supply Chain"],
  "recruitment": ["People", "Human Resources", "Talent"],
  "public speaking": ["Communications", "Marketing", "Sales", "Leadership"],
  "negotiation": ["Sales", "Procurement", "Legal", "Business Development", "Leadership"],
  "leadership": ["Management", "People", "Operations", "Strategy", "Executive"],
  "strategic planning": ["Strategy", "Executive", "Operations", "Finance", "Product"],
  "research": ["Research", "Product", "Marketing", "Data", "Strategy"]
};
```

- **Profile picture:** select from preset images in `/assets/images/profile-pictures/`. No custom upload in v1.
- **Email / Slack visibility:** two independent toggles — a member can show their email without their Slack link, or vice versa, or both, or neither.
- **About me:** free text, 200 characters max, plain text only (no links), optional.
- **Key player:** admin-only boolean, uncapped, shown as a filter and (assumption) a badge on the member's card/profile.

### 3.6 Account deletion & data cascade

- **Self-delete:** the member deletes their own account from their profile page, gated by a confirmation step requiring them to re-enter their password.
- **Admin-delete:** an admin can delete any member's account, gated by a simple "are you sure?" confirmation dialog.
- **No 3-strikes / rejection-blocking system** — explicitly out of scope. Rejected or expired signups can always try again.

When an `AuthUser`/`UserProfile` pair is deleted, two different treatments apply depending on whether the reference represents a *live relationship* or a *historical record*:

- **Live relationships are actively cleaned up:**
  - All `ProjectMember` rows for that user are removed.
  - All `IssueMember` rows for that user are removed.
  - Any `Task.assigned_to` pointing at that user is set to `null` — the task simply displays as "Not assigned" (the exact same display as a task that was never assigned).
  - Any `PollVote` rows by that user are removed — their votes are retracted.
- **Historical attribution is left to dangle and renders as "Deleted user":** `created_by` / `resolved_by` fields (on `Project`, `Issue`, `Task`, `TaskLink`, `Poll`, `PollOption`) are **not** rewritten. The referenced id simply no longer resolves; wherever the UI would show that person's name, it falls back to a "Deleted user" label. This avoids having to touch every historical document on every account deletion, which matters on the hobby tier (fewer writes, better fit for serverless function limits).

This is distinct from **leaving a project voluntarily** (§4.3), where the member still exists as a real account — only their membership in that one project is cleared, and their `created_by` attribution stays correctly pointing at them.

### 3.7 Directory / Explore page

- Visible to any approved member.
- Filters: a "Key players only" toggle, plus one button per team from the master team list (single-select — clicking a team button filters the grid to members with that team). No name search box in v1.
- Grid of member cards (photo + name, presumably a key-player badge).
- Clicking a card opens a popup/modal with the member's full profile (respecting their email/Slack visibility toggles for other viewers).

## 4. Section B — Projects, Issues, Tasks & Polls

Deliberately no comments/chat/discussion system. The flow is: a problem becomes an **Issue**, gets discussed via **Polls**, and gets resolved via **Tasks**. Once every task on an issue is resolved, the issue resolves itself; once every issue on a project is resolved, the project resolves itself.

### 4.1 Data model

**`Project`**

| Field | Type | Notes |
|---|---|---|
| `_id`, `title`, `description` | | |
| `created_by`, `created_at`, `updated_at` | | |
| `status` | enum: `not_started` \| `underway` \| `resolved` | **derived**, see §4.2 |

**`ProjectMember`**

| Field | Notes |
|---|---|
| `project_id`, `user_id` | unique together |
| `role` | `'contact'` \| `'member'` — see permissions note below; at most one `contact` per project, may be none |
| `joined_at` | |

**`ProjectTeam`**

| Field | Notes |
|---|---|
| `project_id` | |
| `team` | String, one value from the master team list (no separate `Team` collection needed — it's a fixed config-driven list, not user-generated data) |
| unique on `(project_id, team)` |

**`Issue`**

| Field | Notes |
|---|---|
| `_id`, `project_id`, `title`, `description` | |
| `created_by`, `created_at`, `updated_at` | |
| `status` | enum: `not_started` \| `underway` \| `resolved` — **derived**, see §4.2 |

Issue creator is automatically added as an `IssueMember`.

**`IssueMember`** — `issue_id`, `user_id`, `added_at`; unique on `(issue_id, user_id)`.

**`Task`** — the only entity with a **manually set** status.

| Field | Notes |
|---|---|
| `_id`, `issue_id`, `name`, `description` | |
| `assigned_to` | nullable; must be a current `ProjectMember` of the issue's project |
| `status` | enum: `not_started` \| `underway` \| `resolved` — manually set |
| `created_by`, `created_at`, `updated_at` | |
| `resolved_at`, `resolved_by`, `resolution` | set together when resolved |

Resolving a task requires a mandatory resolution note (see §4.5). Resolution is immutable in v1 — no edit/reopen UI (deferred to a later version).

**`TaskLink`** — `_id`, `task_id`, `title`, `url`, `created_by`, `created_at`.

**`Poll`** — `_id`, `issue_id`, `question`, `created_by`, `created_at`, `closed_at` (nullable).

**`PollOption`** — `_id`, `poll_id`, `label`, `created_by`, `created_at`. Options can be added at any time by anyone on the project, not just at poll creation.

**`PollVote`** — `poll_id`, `option_id`, `user_id`, `created_at`; **unique on `(poll_id, option_id, user_id)`** (not `(poll_id, user_id)` — a member can vote for multiple options in the same poll, and can change their vote at any time by toggling options on/off, which inserts/deletes individual vote rows).

Polls never resolve an issue directly — they're a decision aid. Only tasks drive resolution.

### 4.2 Status derivation (task → issue → project)

Only `Task.status` is ever set directly by a person. `Issue.status` and `Project.status` are always recalculated bottom-up whenever something underneath them changes (a task's status changes, a task or poll is added/removed to an issue, an issue is added/removed from a project). This guarantees a container can never contradict its children — e.g. an issue can't show "Resolved" while one of its tasks is still open.

```
calculateIssueStatus(issue):
    if issue.tasks.length == 0 and issue.polls.length == 0:
        return "not_started"

    if issue.tasks.length > 0 and every task.status == "resolved":
        return "resolved"

    return "underway"


calculateProjectStatus(project):
    if project.issues.length == 0:
        return "not_started"

    if every issue.status == "resolved":
        return "resolved"

    return "underway"
```

Key behaviours this produces:
- A freshly created issue/project with nothing under it is **Not started**.
- The moment *anything* is added below it — a task or a poll on an issue; an issue on a project — it flips to **Underway**. (A poll alone is enough to move an issue to Underway, even with zero tasks — it's a signal that work has begun, even though a poll can never resolve the issue by itself.)
- An issue only reaches **Resolved** once it has at least one task and all of its tasks are resolved. A project only reaches **Resolved** once it has at least one issue and all of its issues are resolved.
- If a new task is added to an already-Resolved issue (or a new issue to an already-Resolved project), it automatically drops back to **Underway** — reopening is implicit, never a separate action.

### 4.3 Projects landing page & project lifecycle

- A landing page lists **every** project in the organisation as cards (self-serve/open, not invite-only — any approved member can see and join any project). Each card shows title, member count/avatars, issue count, task count, and status.
- A "+ New project" button opens a small create form (title, description). The creator becomes a `ProjectMember` with `role: 'contact'` by default.
- Clicking a card opens the full project page: header (title, description, contact person if set, member count, team tags), then the Issues list.
- **Joining/leaving is entirely self-service.** Any approved member can add themselves to any project. No one can be removed from a project by anyone else — only the member themselves, via a "Leave project" button gated by a simple "are you sure you want to leave?" confirmation. On leaving:
  - Their `ProjectMember` row is removed.
  - Their `IssueMember` rows within that project's issues are removed.
  - Any tasks in that project assigned to them are set back to unassigned.
  - Their `created_by` attribution on anything they made in that project is untouched — they still exist as a member of the org, just not of this project.
- **Team tags** (`ProjectTeam`) can be added or removed by *any* current project member at any time — not locked to the creator, not derived automatically from who happens to be a member (a lead/creator may want to flag "this involves the Fundraising team" before anyone from that team has actually joined).
- **"Leadership" carries no permissions.** The `contact` role on `ProjectMember` exists purely as a display label — "the person to reach out to about this project" — not a gate on any action. Any project member can reassign who holds the `contact` tag (including themselves), and a project can sit with no contact person at all with no consequence. If the contact leaves the project, the tag is simply cleared — no succession logic needed.
- **Deleting a project:** any current project member can delete it, but *only* once its status is `resolved`. Deletion is gated by a confirmation dialog requiring the member to type the exact phrase "delete project" before it proceeds.

### 4.4 Issues

- Any project member can add an issue (title, description). It's immediately `not_started` (see §4.2), the creator is auto-added as an `IssueMember`.
- Collapsed card shows status, "x of y tasks" done, and people count. Clicking expands it in place.
- Expanded view shows: description; people involved (+ Add person, from the project's membership); polls/decisions; tasks (+ Add task).
- Anyone on the *project* can add themselves (or be added) to an issue — issue membership is a subset of project membership, not automatically everyone.

### 4.5 Tasks

- Any project member can add a task under an issue: name, description, optional links, and an assignment choice — "Not assigned" / "Assign to me" / "Assign to [any current project member]". The assignee does **not** need to already be an `IssueMember` — assigning them a task doesn't automatically add them to the issue.
- Task status (`not_started` / `underway` / `resolved`) is set manually and can be reassigned to a different project member at any time before it's resolved.
- **Resolving a task is mandatory to go through a form**, not a single click: a "What was resolved?" textarea is required before the task can be marked resolved. On submit: `status = resolved`, `resolution = <text>`, `resolved_by = current user`, `resolved_at = now`. This is the record of what actually happened, and stays immutable in v1 (no edit/reopen).
- Task links (`+ Add link`, name + URL) are simple attachments to a task — no preview/validation beyond being a URL.

### 4.6 Polls

- Any project member can create a poll on an issue (question + initial options), and any project member can add further options later — not locked to the poll creator.
- Voting is multi-select and changeable at any time before the poll closes: clicking an option toggles a `PollVote` row for that (poll, option, user) on/off. A member can hold votes on several options simultaneously.
- Any project member can close a poll (not just its creator) — once closed, vote counts are shown as the final result. Closing a poll never changes issue/project status by itself; it's purely informational to help the group decide what tasks to create.

### 4.7 Permissions summary

Section B permissions are intentionally flat — there is no elevated "lead" tier. Any approved, verified member of the app who is a member of a given project can, within that project: add issues, add/remove people from issues, create tasks, assign tasks to *any* current project member, resolve tasks, add task links, create/add-options-to/vote-on/close polls, add/remove team tags, and delete the project once it's resolved. The only actions restricted to the individual themselves are leaving a project and editing/deleting their own account. Section A's admin-only actions (approvals, promote/demote admin, delete-any-user) remain the only privileged tier in the whole app.

## 5. Styling

Visual language should draw from [cherry.org.uk](https://cherry.org.uk/) (colour palette, type, general warmth/tone) without literally copying it. Every screen — directory, project cards, expanded issues, forms, admin pages — should read as one consistent, tidy, uncluttered system rather than a generic admin dashboard.

## 6. Explicitly out of scope for v1

Comments/chat/activity feeds, task priorities/labels/dependencies/subtasks, recurring tasks, multiple task assignees, notifications, file attachments, time tracking, Kanban boards, calendars, Gantt charts, project milestones, task edit/reopen after resolution, Cloudinary/custom photo uploads, a 3-strikes rejection-blocking system, forced removal of a project member by anyone but themselves, scheduled/cron-based cleanup jobs (all cleanup is lazy/on-demand), and automated tests (manual testing only, by request).


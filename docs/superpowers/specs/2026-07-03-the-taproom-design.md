# The Taproom — Design Spec

**Date:** 2026-07-03 (revised after UI mockup pass); card interactions revised 2026-07-04
**Status:** Draft for review
**Visual reference:** `docs/mockups/2026-07-03-taproom-mockup.html` — a static, self-contained
HTML mockup of every view described below. Open it directly in a browser; it's the
canonical picture of what "done" looks like for v1, this document is the canonical
description of *why* and *exactly what data it runs on*.
**See also:** `docs/superpowers/specs/2026-07-04-board-card-interactions-design.md` for the
detailed design of drag-and-drop, the card detail modal, and comments (§8 below was revised
to match).

## 1. Purpose

Siply's four-person team (Ashoka, Anulome, Arvin, Jason) currently tracks bugs, feature
ideas, tasks, legal/GDPR notes, funding roadmap, and reference links inside one long
Google Doc (`Siply.pdf`). It works, but it's unsearchable, has no workflow state (nothing
tracks "done" vs "not done" except manual strikethrough), and mixes together material
that's read once (the YC application) with material that's used daily (the task list).

**The Taproom** is a small internal web app that gives the team:

- A **Home** landing view for capturing new items and seeing what's yours and what's due.
- Three kanban boards — **Bugs**, **Features**, **Tasks** — so day-to-day work has a
  visible status instead of living in a doc.
- A **Resources** hub — categorized links and markdown notes — replacing the reference
  material currently scattered through the doc (legal Q&A, GDPR checklist, funding
  roadmap, Figma/Canva links, market research sources).
- An **Environments** view tracking Siply product deploy status (Test/Prod), separate
  from any of the above.
- A **Usage** view combining real product analytics (once launched) with the pre-launch
  validation research the team already has.

It is explicitly **not** the Siply product. It is internal-only tooling for the four
founders, built to be simple to run and cheap to keep alive, so no one's dev time is
pulled from the actual app for more than the initial build.

## 2. Non-goals (v1)

- No email notifications or digests
- No file uploads (links only, no attachments)
- No roles/permissions — all four accounts are equal
- No public sign-up — accounts are pre-created for the four founders
- No mobile app — responsive web only (the web app itself must still work on a phone
  browser; see §7 Responsiveness)
- No credential/password storage — flagged separately in §13
- No global cross-view search — search is scoped to the Board view (current board only)
  and the Resources view. A single search bar covering everything is a plausible v2, not
  v1: it needs an index/ranking strategy that a per-view substring filter doesn't.
- No user-impersonation / "view as" feature in the real app. The mockup's clickable
  avatar switcher is a *prototyping device* to demo personalization without wiring up
  real auth — see §5.

## 3. Tech Stack

**Next.js (App Router, React) + PostgreSQL (Neon free tier) + Prisma, deployed on Vercel.**

Rationale:
- One codebase covers both UI and API routes — no separate backend service to run.
- Vercel + Neon are both free at this scale (4 users, low traffic) and need no server
  management — no VPS, no patching, no uptime babysitting.
- Prisma gives a typed schema and migrations without hand-written SQL.
- Deploys are `git push` — no CI/CD to configure.

This is a deliberately different stack from Siply-MVP's FastAPI + MongoDB. The Taproom
is small enough that "simplest possible" wins over "match the main app's stack" — no one
needs to context-switch into a shared codebase to fix a typo on a resource link.

## 4. Brand & Theme

The Taproom borrows the **live** Siply brand tokens (from `Siply-MVP/frontend/tailwind.config.js`,
which supersedes the older color values in the original pitch-deck PDF):

| Token | Value |
|---|---|
| `siply-lime` | `#D0FF14` |
| `siply-magenta` | `#6C244C` |
| `siply-charcoal` | `#24272B` |
| `siply-card` | `#2D3035` |
| `siply-black` | `#1A1A1A` |

Fonts: **Cabinet Grotesk / Bebas Neue** (display/headings), **Manrope / Inter** (body). The
mockup approximates these with system-font stacks (heavy-weight uppercase system sans for
display, OS default humanist sans for body) since webfont files aren't embeddable in a
CSP-sandboxed artifact — the real build should use the actual brand font files if
available, falling back to the same system stack otherwise.

Semantic colors (status, not brand accent): good `#6FCF97`, warning `#F2B84B`, bad
`#E5484D`, pending/neutral `#9CA3AA` — used for priority stripes, due-date urgency, and
environment/pipeline status pills. These are separate from the lime/magenta brand accent.

Dark theme by default (charcoal/black background, lime accents for primary actions and
active states, magenta for secondary emphasis) — matching the Siply app's look, so The
Taproom reads as "part of Siply" rather than a bolted-on generic tool.

## 5. Auth

- Individual accounts for all four founders, pre-created via a seed script — **no public
  sign-up route exists at all**.
- Login: email + password, session cookie (via `next-auth` Credentials provider or a
  minimal hand-rolled session — implementation detail for the plan stage).
- Initial passwords are set in the seed script and shared out-of-band (Signal/WhatsApp,
  not committed to the repo). A basic "change password" page lets each person set their
  own after first login.
- No roles: any logged-in user can create/edit/move/delete any card or resource.
- **"Viewing as" in the real app is just "who's logged in."** The mockup includes a
  click-to-switch avatar row in the sidebar so a single static HTML file could demo
  Home's personalization (My Open Cards, the "Mine" board filter) for all four people
  without real auth. In the built app, this isn't a feature to implement — `currentUser`
  is simply the authenticated session user, always. Do not build an impersonation switcher.

## 6. Home

The landing view. Its job is capture-and-triage, not passive stats — everything on it is
either an input or pulled live from board data, nothing is a static dashboard tile.

- **Quick capture** — a title field + type dropdown (Bug / Feature idea / Task) + "Add
  card" button. Creates a card directly on the relevant board's first column. This is the
  fast path for "don't lose the thought," replacing ad-hoc WhatsApp messages.
- **My open cards** — every card assigned to the current user, across all three boards,
  excluding cards in a terminal column (`Done` on Tasks, `Released` on Bugs/Features).
  Each entry shows a small board-type tag (Bug/Feature/Task) and its due date if it has
  one. This is derived data — no separate "my cards" table, just a filtered query.
- **Due soon** — every card with a due date, across all boards and all assignees, sorted
  soonest-first, capped at 5. Also derived data, sourced from the same `dueDate` field
  used on cards — Home never stores its own copy of a deadline.
- **Recently completed** — the last handful of cards moved into a terminal column
  (`Done`/`Released`), most recent first. Read-only, no separate activity-log table
  required — just a query ordered by `updatedAt` filtered to terminal columns.
- **Quick links** — a handful of the most-used Resources → Links entries (GitHub repo,
  Figma, pitch deck, MEC page), so the two or three links people open constantly don't
  require a full trip to Resources.

## 7. Boards

Three boards. **Bugs** and **Features** share one pipeline; **Tasks** is simpler because
it isn't a build-test-release workflow:

- **Bugs:** To Do → In Progress → Ready to Test → Ready for Release → Released
- **Features:** To Do → In Progress → Ready to Test → Ready for Release → Released
- **Tasks:** To Do → In Progress → Done

Columns are a **fixed constant per board type** in v1, not a user-editable setting —
change the constant in code if the workflow needs to change; don't build a column-editor
UI for four people.

Each board page shows a one-line purpose blurb under its title so it's clear at a glance
what belongs there (e.g. Bugs: *"Something broken in the live product? Log it, track it,
watch it through to release."*).

**Card fields:**
- `title` (required)
- `description` (optional, plain text — no rich text editor needed for v1)
- `assignee` (one of the 4 users, optional)
- `priority` (Low / Medium / High, optional) — shown as a left-edge color stripe on the
  card; the priority *label* is only rendered on the card face for High (the one that
  needs to grab attention at a glance) — Medium/Low are conveyed by stripe color alone to
  keep the board visually quiet.
- `dueDate` (optional, simple date — no time component needed)
- `createdBy`, `createdAt`, `updatedAt`

**Interaction:** drag-and-drop between columns within a board — dropping a card into a
column appends it to that column (no manual reordering within a column in v1); create/edit/
archive cards. Archived cards are hidden from the board but not deleted (soft delete), so
history isn't lost.

**Empty states:** a column with zero cards shows a short dashed-border placeholder
message rather than blank space (e.g. Bugs → Released, pre-launch: *"Nothing released yet
— Siply hasn't launched."*). A column that has cards but none match the active
filter/search shows a lighter "No matching cards." message instead — these are two
different states and should read differently (permanently empty vs. temporarily filtered
out).

## 8. Card Detail View

Clicking any card opens a **centered modal** (not a slide-over drawer) showing: full title,
board + column, priority, assignee, due date, full description, a footer with who created
it and when, and a comment thread. Title and description are editable inline (save on
blur); priority, assignee, and due date are dropdowns that save immediately on selection —
there's no separate "edit mode" or Save button anywhere in the modal.

**Comments:** any of the four founders can add a comment (authored as whoever is currently
logged in) and any founder can delete any comment — consistent with §2's "no roles, all
four equal." Full data model and UI detail in
`docs/superpowers/specs/2026-07-04-board-card-interactions-design.md`.

## 9. Filtering & Search

- **Assignee filter** (Board view only) — a row of chips above the board: *All*, *Mine*
  (resolves to the logged-in user), and one chip per teammate. Filters visible cards on
  the currently-open board by `assignee`. Resets to *All* when switching boards.
- **Board search** (Board view only) — a text input filtering the currently-open board's
  cards by title substring, live as you type. Combines with the assignee filter (both
  must match). Resets when switching boards.
- **Resources search** — a text input filtering both Links and Notes by their visible
  text (title, category, preview), live as you type.
- Filtering updates each column's visible card count badge live, so "3 bugs assigned to
  Anulome" is always an accurate number, not a stale total.

## 10. Resources Hub

Two sections:

- **Links** — title, URL, category (Design / Engineering / Product & Strategy / Market
  Research / Funding / Other), added-by. Grouped by category.
- **Notes** — title, markdown body, category, last-updated-by/at. Replaces long-form doc
  sections like the GDPR checklist and legal Q&A.

No file uploads in v1 — if something needs to be shared as a file, link to wherever it
already lives (Google Drive, Figma, Canva).

## 11. Environments

A dedicated view (not part of Home) showing where the **Siply product itself** — not The
Taproom — is deployed:

- **Test** and **Production** cards, each showing a status pill and a short meta line.
- Pre-launch, both are honestly shown as not-yet-live (e.g. "Setting up" / "Not started")
  rather than faked as healthy — there is no real data to show yet, and the UI should say
  so plainly.
- **v2, not v1:** once Test/Prod exist, this view is where real uptime, response time,
  and last-deploy timestamp would surface, sourced from a simple health-check ping rather
  than a full observability stack. No new subsystem needed to add this later — just wire
  real data into the same two cards.

## 12. Usage

A dedicated view with two panels:

- **Live product usage** — total users, signups (7d), active this week. Pre-launch, shown
  as pending placeholders ("—, Awaiting launch"), not fabricated numbers. Once Siply has
  real traffic, these three numbers are enough for v1 — sourced from a simple events
  table or a lightweight analytics tool (Vercel Analytics/Plausible), not a full analytics
  suite.
- **Validation research** — the real numbers the team already has from the pre-launch
  consumer survey (94 people surveyed; 84% forget or lose rewards; 68% say an app like
  Siply would be useful; 86% are open to downloading). This data exists today and doesn't
  wait on launch — it's a fixed reference sourced from the Resources → Notes writeup, not
  a live query.

## 13. Seed Data

On first deploy, the seed script populates:

- **4 user accounts** (Ashoka, Anulome, Arvin, Jason) with temporary passwords.
- **Tasks board** — the open items from the doc's most recent task lists (e.g. "Set up
  Google Workspace," "Book a call with Bryan Baillie," "Company registration," "Plan
  server purchase," etc.), with assignees, priorities, and due dates where the doc implies
  one, plus the already-completed items (colour scheme, logo, Gantt chart, consumer
  survey) in Done.
- **Bugs and Features boards** — a handful of realistic starter cards grounded in
  Siply-MVP's actual README features (map, Drink Card share, GDPR export, Google Sign-in,
  Discover feed), spread across the 5-stage pipeline, so the boards aren't empty and the
  pipeline concept is legible from day one.
- **Resources → Links** — Figma, Canva (pitch deck + app store preview), MEC Notion page,
  GitHub repo.
- **Resources → Notes** — GDPR compliance checklist, the legal-advisory question list, and
  the funding roadmap, converted from the doc's prose into markdown notes.
- **Usage → Validation research** — the fixed survey numbers above.

This is a one-time import; the doc itself is not kept in sync afterward — The Taproom
becomes the source of truth going forward.

## 14. Security Note (flagged, not solved here)

The source doc contains at least one plaintext credential (a social media account
password). **The Taproom's Resources hub explicitly does not store credentials** — it's
built for links and notes, not secrets. Recommend the team adopt a shared password
manager (e.g. Bitwarden or 1Password, both have free/cheap team tiers) for anything
that's actually a login credential, separate from this tool.

## 15. Deployment

- Private GitHub repo (`the-taproom`), separate from `Siply-MVP`.
- Vercel project linked to the repo; auto-deploy on push to `main`.
- Neon Postgres free-tier database; connection string in Vercel env vars.
- No custom domain required for v1 — the default `*.vercel.app` URL is fine for an
  internal tool; can add a custom subdomain later if wanted.

## 16. Responsiveness

Not a mobile app (§2), but the web app must remain usable on a phone browser between
meetings. At minimum: the sidebar collapses to a bottom bar or hamburger below ~700px,
board columns remain horizontally scrollable, and the card detail modal becomes full-width/
full-height on small screens rather than a fixed centered dialog.

## 17. Open items for the implementation plan

- Exact session/auth mechanism (`next-auth` Credentials vs. a minimal hand-rolled
  session) — implementation detail, not a design fork.
- Exact seed data mapping from doc sections to Bugs/Features/Tasks entries (the mockup's
  card set, listed in `docs/mockups/2026-07-03-taproom-mockup.html`, is a strong starting
  point and can likely be used close to as-is).
- Whether "Recently completed" on Home is a live query (as designed) or a simpler
  hardcoded-on-load list for v1 — recommend live query, it's not meaningfully more work.

# Phase 1 — Real App Build: Design Spec

**Date:** 2026-07-06
**Status:** Approved (post-interview) — pending final user sign-off on this file
**Parent specs:**
- `docs/superpowers/specs/2026-07-03-the-taproom-design.md` — overall app design.
- `docs/superpowers/specs/2026-07-04-board-card-interactions-design.md` — drag-and-drop,
  card modal, comments detail (unchanged, still authoritative for that behavior).
- `docs/BUILD-STATUS.md` — prior session's locked stack/auth decisions.

This document **narrows scope and resolves every open item** left in the docs above,
based on a follow-up interview with Jason on 2026-07-06. Where this doc conflicts with an
earlier spec, **this doc wins.**

## 1. Purpose

Turn the static HTML mockup into a real, working Next.js app for Siply's four founders
(Ashoka, Anulome, Arvin, Jason) to track bugs, features, and tasks while building Siply.
This is the first real build pass — get the interactive core (Board) and the daily
landing view (Home) fully working against a real database, while the less-critical views
(Resources, Usage) are stubbed as visible-but-not-yet-built.

## 2. Scope

**In scope, fully working:**
- Auth (login, session, logout).
- Home page: quick capture, my open cards, due soon, recently completed, quick links.
- Three boards — Bugs, Features, Tasks — with drag-and-drop, filtering/search, the card
  detail modal, and comments, per the 2026-07-04 interactions spec.

**In scope, placeholder only:**
- Resources and Usage: visible in nav, each renders a simple "In development" page. No
  CRUD, no real content. (Home's Quick Links widget still queries the Links table live —
  see §6 — so it will show "No links yet" until Resources is built out later.)

**Cut entirely (not deferred, not built):**
- **Environments view.** Siply only has one environment right now, so a view built to
  show environment status has nothing meaningful to display. Dropped from nav and schema.
  Revisit only if Siply ever has a real multi-environment split worth surfacing.

**Explicitly out of scope for this pass:**
- Automated tests (manual verification instead — see §9).
- Real deployment (local Docker only — see §8).
- Change-password UI (see §5).
- Seeded demo data — no cards, resources, or notes are pre-populated (see §7).

## 3. Stack

- **Next.js (App Router) + React** — one codebase, UI + API routes.
- **PostgreSQL**, run in Docker.
- **Prisma** — schema, migrations, typed queries.
- **Hand-rolled auth** — bcrypt + signed httpOnly sameSite session cookie, no NextAuth.
- **Plain CSS**, not Tailwind — see §10.
- **No test framework** added this pass.

## 4. Data model (Prisma, high level)

- `User` — id, username, passwordHash, displayName, avatarColor.
- `Card` — id, boardType (`BUG` / `FEATURE` / `TASK`), column (string, validated against
  the fixed per-board-type column list below), title, description, assigneeId (nullable →
  `User`), priority (`LOW` / `MEDIUM` / `HIGH`, nullable), dueDate (nullable), archived
  (bool, default false), createdById → `User`, createdAt, updatedAt.
- `Comment` — id, cardId → `Card`, authorId → `User`, text, createdAt.
- `Link` — id, title, url, category, addedById → `User`, createdAt. Exists now purely so
  Home's Quick Links widget has a real (empty) table to query; no create/edit UI ships
  this pass — that comes with Resources in a later phase.

**Fixed columns per board type** (constants in code, not user-editable, per parent spec):
- Bugs / Features: To Do → In Progress → Ready to Test → Ready for Release → Released
- Tasks: To Do → In Progress → Done

No `Note`, `Environment`, or analytics/events tables this pass — Resources' Notes section
and Usage's live/validation data are deferred with those views.

## 5. Auth

- 4 accounts (Ashoka, Anulome, Arvin, Jason), created by a seed script — **no self-service
  signup route exists.**
- **All 4 accounts share the same seeded password**, set directly in the seed script
  (a real value Jason chooses at setup time, not committed as a placeholder secret).
- Login route: look up by username, `bcrypt.compare`, on success set a signed, httpOnly,
  sameSite session cookie.
- Middleware/server check validates that cookie on every protected route, API call, and
  Server Action — the browser never talks to Postgres directly.
- **No change-password page this pass** — if a password ever needs to change, it's
  updated directly via the seed script / DB. Revisit if this becomes a real annoyance
  after deployment.
- The mockup's clickable "viewing as" avatar switcher is **not** built — the avatar row
  becomes a read-only display of the logged-in user (per parent spec §5).

## 6. Home

Exactly per parent spec §6, with one clarification:

- **Quick Links** queries the real (empty) `Link` table and renders whatever it finds —
  which is nothing, today. It shows an empty-state message rather than being removed from
  the page, so it's ready the moment Resources gets built and links get added.
- Quick capture, My open cards, Due soon, and Recently completed are all live queries
  against real `Card` data, exactly as designed in the parent spec.

## 7. Seed data

The seed script creates **only the 4 user accounts** with the shared password from §5.

**Nothing else is seeded** — no boards, cards, comments, links, or notes. This reverses
the parent spec §13 and the interactions spec §5's "seed data" note (which assumed demo
cards/comments for the mockup). The app starts genuinely empty; the founders populate it
themselves as real work happens.

## 8. Docker

- **Whole app in Docker**, not just Postgres — `docker compose up` brings up both the
  Next.js app and Postgres with one command.
- **Dev-mode compose**: the Next.js container runs `next dev`, with the project source
  volume-mounted in, so code changes reload live without an image rebuild. Postgres data
  persists in a named volume across restarts.
- **Local only** — no production-style build, no deployment config, this pass. Jason will
  deploy once a server is ready; a prod-mode Dockerfile/compose is a follow-up at that
  point, not built speculatively now.

## 9. Testing & verification

No automated test suite this pass (Vitest/RTL considered, explicitly deferred). Instead:
manual verification via the `verify` skill — driving the actual app (login, create a
card, drag it, open the modal, comment, check Home reflects it) before calling any part
of this done.

## 10. Frontend translation

The mockup (`docs/mockups/2026-07-03-taproom-mockup.html`) is a single static file: plain
hand-written CSS in a `<style>` block (no Tailwind), vanilla JS for interactivity.
Translation approach:

- Port the existing CSS forward largely as-is (same class names, same visual result) as
  the app's global stylesheet — not a Tailwind rewrite. The mockup already produces the
  exact look wanted; converting it to utility classes would be extra translation work
  with more chances to drift from it, not less.
- Rebuild the markup as React components: `Sidebar`, `Home`, `Board`, `Card`,
  `CardModal`, `CommentThread`, plus stub `Resources`/`Usage` pages.
- Vanilla JS interactions (filtering, drag-and-drop, modal open/close, comment
  add/delete) become React state + real API calls per the 2026-07-04 interactions spec,
  which stays authoritative for exact drag-and-drop/modal/comment behavior — only its
  "in-memory only, resets on refresh" and "seed two cards with comments" notes are
  superseded (now real persistence; no seeded comments, per §7 above).
- The "viewing as" avatar switcher becomes read-only (§5).

## 11. Deployment

Not this pass. Local Docker only (§8). No Vercel/Neon, no custom domain, no CI — all
deferred until Jason has a server ready.

## 12. Out of scope / cut, summarized

| Item | Status |
|---|---|
| Environments view | Cut entirely |
| Resources (Links/Notes CRUD) | Placeholder page only |
| Usage (live + validation data) | Placeholder page only |
| Seeded demo cards/resources/notes | Not seeded — accounts only |
| Change-password page | Not built this pass |
| Automated tests | Not added this pass |
| Real deployment | Deferred to a later pass |
| Tailwind migration | Rejected — plain CSS ported forward |

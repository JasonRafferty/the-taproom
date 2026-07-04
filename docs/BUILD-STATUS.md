# The Taproom — Build Status & Handoff

**Last updated:** 2026-07-04
**Purpose:** Pick-up point so the next session starts exactly where this one left off.
**Read this first, then the two design specs it links to.**

---

## Where we are right now

We have finished **design** and are about to start **building the real app**. Nothing has
been built yet — the only code that exists is the static HTML mockup. The next action is to
write the **Phase 1 implementation plan** and start coding.

### What exists in the repo today
- `docs/mockups/2026-07-03-taproom-mockup.html` — the canonical static mockup of every
  view. This session improved the Board: fixed a hidden-board bug, added a themed
  horizontal scrollbar + chevron scroll-nav buttons, and made it Jira-style (fixed-height
  board, columns scroll independently with sticky headers). **Drag-and-drop, the card
  modal, and comments are SPEC'd but NOT yet in the mockup** — they'll be built directly in
  the real app instead of the mockup.
- `docs/superpowers/specs/2026-07-03-the-taproom-design.md` — the parent design spec for
  the whole app (Home, Boards, Resources, Environments, Usage, auth, seed data).
- `docs/superpowers/specs/2026-07-04-board-card-interactions-design.md` — detailed spec for
  drag-and-drop, the card detail modal, and comments.

### What is NOT in the repo yet
- No Next.js app, no `package.json`, no database, no auth — just docs and the mockup.

---

## Decisions locked this session (these OVERRIDE the specs where they differ)

The specs were written earlier and assume some things we've since changed. **Where this
section conflicts with a spec, this section wins** — update the specs to match when
building.

### Stack (final)
- **Next.js (App Router) + React** — one codebase for UI + API.
- **PostgreSQL** run **locally** (Docker Compose is the assumed way to run it — not yet
  confirmed with Jason; confirm or offer alternative on pickup).
- **Prisma** — schema + typed queries + migrations + Prisma Studio for poking at data.
- **Hand-rolled auth** (NOT NextAuth) — see below.
- **NO deployment for now.** Local-only demo. Ignore the specs' Vercel/Neon deployment
  sections (§15 of the parent spec) for this phase.

### Auth (final)
- **Username + password only.** Simple. No email flows, no OAuth, no public sign-up.
  (Note: the parent spec §5 says "email + password" — Jason explicitly asked for
  **username** + password. Use username.)
- **Hand-rolled, ~3 small pieces:**
  1. Seed script creates the 4 founder accounts with **bcrypt-hashed** passwords.
  2. Login route: look up user, `bcrypt.compare`, on success set a **signed, httpOnly,
     sameSite** session cookie.
  3. Middleware checks that cookie on every protected route/API call; 401 if missing/invalid.
- Every API route / Server Action must check the session **server-side** — the browser
  never talks to the DB directly. This is the meaning of "properly authenticated" here.
- 4 accounts: Ashoka, Anulome, Arvin, Jason. No self-service signup route exists at all.

### Why we rejected other options (so we don't re-litigate tomorrow)
- **NextAuth** — rejected: its value is abstracting over many auth methods (OAuth, magic
  links) we'll never use. Overkill for 4 fixed username+password accounts.
- **SQLite / Turso** — discussed, rejected: Jason chose "the normal one, Next.js, Postgres."
- **Supabase / BaaS** — rejected: Jason wants proper server-enforced auth, not
  RLS-and-trust; and wants it built properly, not fewest-lines.
- **Express + vanilla JS on an always-on host** — rejected: reintroduces server-management
  ops we're avoiding.
- **Drizzle instead of Prisma** — considered as lighter alternative; Jason went with the
  "normal" Prisma path.

---

## Build phasing

### Phase 1 — Foundation + Board (DO THIS FIRST)
Scaffold, schema, seed, auth, and the Board view (the hardest, most-interactive view).
Includes drag-and-drop, the card detail modal, and comments per the
`2026-07-04-board-card-interactions-design.md` spec.

**Parallelism reality:** Phase 1 is mostly sequential (schema → auth → board can't be built
out of order). The ONE genuine parallel split:
- **Track A (backend):** Prisma schema + seed script + hand-rolled auth.
- **Track B (frontend):** translate the mockup's Board UI (columns, cards, modal, comments,
  drag-and-drop) into React components against placeholder/mock data.
- **Then:** a short integration pass wires B to A's real data + session.

Don't build a plan around 4-way parallelism — the work is really 2-way in this phase, and
over-splitting just creates blocked/idle agents.

### Phase 2 — Remaining views (LATER)
Home, Resources, Environments, Usage. Mostly read-heavy CRUD, lower risk. These four barely
touch each other, so this is where parallel subagents genuinely pay off — one per view once
Phase 1's schema + auth exist.

---

## Orchestration setup (per Jason's request)

- **This session's model is now Opus** (Jason switched via `/model opus`). Opus should
  **orchestrate sparingly** to save tokens, and **spin up Sonnet subagents** to do the
  actual per-task work in parallel where the work genuinely splits.
- **Known constraint:** the subagent dispatch tool lets us choose the *model*
  (sonnet/opus/haiku) and *agent type*, but does **not** expose a per-subagent
  "medium/high reasoning effort" dial — effort is fixed by agent-type config / session
  inheritance. So "Sonnet medium/high" can't be literally set per call; pick sensible agent
  types instead. (Flagged to Jason.)

---

## Next action on pickup

1. Confirm local Postgres approach (Docker Compose assumed).
2. Update the two specs to match the "Decisions locked" section above (username not email;
   hand-rolled auth; local-only, defer deployment).
3. Write the **Phase 1 implementation plan** (invoke the writing-plans skill), structured
   around the Track A / Track B split.
4. Begin building Phase 1 with Opus orchestrating + Sonnet subagents for the A/B split.

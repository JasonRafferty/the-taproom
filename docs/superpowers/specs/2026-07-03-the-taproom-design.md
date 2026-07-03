# The Taproom — Design Spec

**Date:** 2026-07-03
**Status:** Draft for review

## 1. Purpose

Siply's four-person team (Ashoka, Anulome, Arvin, Jason) currently tracks bugs, feature
ideas, tasks, legal/GDPR notes, funding roadmap, and reference links inside one long
Google Doc (`Siply.pdf`). It works, but it's unsearchable, has no workflow state (nothing
tracks "done" vs "not done" except manual strikethrough), and mixes together material
that's read once (the YC application) with material that's used daily (the task list).

**The Taproom** is a small internal web app that gives the team:

- Three kanban boards — **Bugs**, **Features**, **Tasks** — so day-to-day work has a
  visible status instead of living in a doc.
- A **Resources** hub — categorized links and markdown notes — replacing the reference
  material currently scattered through the doc (legal Q&A, GDPR checklist, funding
  roadmap, Figma/Canva links, market research sources).

It is explicitly **not** the Siply product. It is internal-only tooling for the four
founders, built to be simple to run and cheap to keep alive, so no one's dev time is
pulled from the actual app for more than the initial build.

## 2. Non-goals (v1)

- No comments/activity feed on cards
- No email notifications or digests
- No file uploads (links only, no attachments)
- No roles/permissions — all four accounts are equal
- No public sign-up — accounts are pre-created for the four founders
- No mobile app — responsive web only
- No credential/password storage — flagged separately below

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

Fonts: **Cabinet Grotesk / Bebas Neue** (display/headings), **Manrope / Inter** (body).

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

## 6. Boards

Three boards, each with **fixed columns** (a constant in code, not a user-editable
setting in v1 — easy to change later if the workflow needs it):

- **Bugs:** Reported → Confirmed → In Progress → Fixed → Verified
- **Features:** Backlog → Considering → Planned → In Progress → Shipped
- **Tasks:** To Do → In Progress → Done

**Card fields:** title, description (optional), assignee (one of the 4 users, optional),
priority (Low/Medium/High, optional), created-by, created-at, updated-at.

**Interaction:** drag-and-drop between columns within a board; create/edit/archive cards.
Archived cards are hidden from the board but not deleted (soft delete), so history isn't
lost.

## 7. Resources Hub

Two sections:

- **Links** — title, URL, category (free-text or small fixed set: Design, Legal, Market
  Research, Funding, Other), added-by. Simple list, grouped by category.
- **Notes** — title, markdown body, category, last-updated-by/at. Replaces long-form
  doc sections like the GDPR checklist and legal Q&A.

No file uploads in v1 — if something needs to be shared as a file, link to wherever it
already lives (Google Drive, Figma, Canva).

## 8. Seed Data

On first deploy, the seed script populates:

- **4 user accounts** (Ashoka, Anulome, Arvin, Jason) with temporary passwords.
- **Tasks board** — the open items from the doc's most recent task lists (e.g. "Set up
  google workspace," "Pay for claude pro," "Company registration," "Plan server
  purchase," etc.), so the board isn't empty on day one.
- **Resources → Links** — Figma, Canva (pitch deck + app store preview), MEC Notion
  page, GitHub repo.
- **Resources → Notes** — GDPR compliance checklist and the legal-advisory question list,
  converted from the doc's prose into markdown notes.

This is a one-time import; the doc itself is not kept in sync afterward — The Taproom
becomes the source of truth going forward.

## 9. Security Note (flagged, not solved here)

The source doc contains at least one plaintext credential (a social media account
password). **The Taproom's Resources hub explicitly does not store credentials** — it's
built for links and notes, not secrets. Recommend the team adopt a shared password
manager (e.g. Bitwarden or 1Password, both have free/cheap team tiers) for anything
that's actually a login credential, separate from this tool.

## 10. Deployment

- Private GitHub repo (`the-taproom`), separate from `Siply-MVP`.
- Vercel project linked to the repo; auto-deploy on push to `main`.
- Neon Postgres free-tier database; connection string in Vercel env vars.
- No custom domain required for v1 — the default `*.vercel.app` URL is fine for an
  internal tool; can add a custom subdomain later if wanted.

## 11. Open items for the implementation plan

- Exact session/auth mechanism (`next-auth` Credentials vs. a minimal hand-rolled
  session) — implementation detail, not a design fork.
- Exact seed data mapping from doc sections to Tasks/Resources entries.

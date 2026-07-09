# Home: Match Mockup (Decisions feature + fun panel) — Implementation Plan

> **For agentic workers:** subagent-driven-development. Steps use checkbox syntax.

**Goal:** Rebuild the Home page to faithfully match the mockup (`docs/mockups/2026-07-03-taproom-mockup.html`, `#view-home`): a `home-showcase` 2-column grid holding a "Decisions needed" panel (a real, persisted CRUD feature) and an animated Siply-logo "fun" panel, above the existing quick-capture panel.

**Why:** The Phase 1 build gave Home a simplified 5-panel layout (my open cards / due soon / recently completed / quick links) that doesn't match the mockup. The user chose "match the mockup exactly." The mockup's Home is a different design centered on a **Decisions** feature that has no backend yet.

**Architecture:** `Decision` is structurally a sibling of `Card` — a Prisma model + REST routes under `/api/decisions`, consumed by a client `DecisionsPanel` component (same shape as `CommentThread`: fetch on mount, optimistic-ish list mutations). The fun panel is static decorative markup driven by CSS already ported into `globals.css`.

**Tech stack:** unchanged from Phase 1 (Next.js App Router + TS, Prisma 7 + `@prisma/adapter-pg`, Docker dev, no bind mount → `docker compose up -d --build` after every change).

## Global Constraints (carry over from Phase 1 — all still binding)

- Every Prisma query embedding a `User` relation MUST use `{ select: USER_SUMMARY_SELECT }` (from `@/lib/boards`), never a bare `true` include — leaks `passwordHash`, and all 4 accounts share one password.
- Never put `await` inside a non-async arrow passed to a state setter — resolve the value first, then call the setter.
- Dynamic route handler `params` is a `Promise` — always `const { id } = await params;`.
- New API routes are auto-protected by `src/middleware.ts` (everything except `/login` + `/api/auth/login` requires a session). Routes that need the caller's identity still call `getCurrentUser()` explicitly and 401 if null.
- No automated tests this pass — verify via curl (API) + a stated browser-checklist for visuals. Docker: `docker compose up -d --build` to apply changes; run Prisma CLI via `docker compose exec app ...`; when generating a migration inside the container, copy `prisma/migrations/` back to the host with `docker compose cp`.
- No seed data — Decisions start empty with an empty-state message (consistent with the project's accounts-only seed rule).
- Match the mockup's exact class names (all already in `globals.css`): `home-showcase`, `capture-panel`, `capture-row`, `capture-input`, `capture-select`, `panel`, `decision-panel`, `panel-head-row`, `panel-count`, `btn-secondary`, `decision-form`, `decision-form-grid`, `decision-input`, `decision-select`, `decision-textarea`, `decision-form-actions`, `decision-list`, `decision-item`, `decision-title`, `decision-meta`, `decision-side`, `decision-status`, `decision-actions`, `icon-btn`, `is-danger`, `pill`, `fun-panel`, `logo-stage`, `logo-ring`, `logo-tick`, `siply-logo-hero`, `fun-copy`, `fun-kicker`, `fun-title`, `fun-chip`. Do NOT invent new class names or add new CSS.
- Status → pill color mapping (from the mockup): `OPEN`→`pending`, `DISCUSS`→`warn`, `BLOCKING`→`bad`, `RESOLVED`→`good`.

---

### Task D1: Decision model + API routes

**Files:**
- Modify: `prisma/schema.prisma` (add `Decision` model + `DecisionStatus` enum; add `decisions Decision[]` back-relation to `User`)
- Create: `prisma/migrations/<ts>_add_decision/migration.sql` (generated)
- Create: `src/app/api/decisions/route.ts` (GET list, POST create)
- Create: `src/app/api/decisions/[id]/route.ts` (PATCH update, DELETE)

**Interfaces:**
- Consumes: `prisma` (`@/lib/db`), `getCurrentUser` (`@/lib/auth`), `USER_SUMMARY_SELECT` (`@/lib/boards`).
- Produces:
  - `GET /api/decisions` → non-resolved decisions, `owner` safe-projected, ordered `createdAt asc`.
  - `POST /api/decisions` — body `{ title, note?, ownerId?, status? }` → `201` created decision (default status `OPEN`).
  - `PATCH /api/decisions/:id` — body: subset of `{ title, note, ownerId, status }` → `200` updated decision.
  - `DELETE /api/decisions/:id` → `200 { ok: true }`.

- [ ] **Step 1: Add the model + enum to `prisma/schema.prisma`**

Add after the existing `Priority` enum:

```prisma
enum DecisionStatus {
  OPEN
  DISCUSS
  BLOCKING
  RESOLVED
}
```

Add a new model (place after `Card`):

```prisma
model Decision {
  id        String         @id @default(cuid())
  title     String
  note      String?
  owner     User?          @relation("DecisionOwner", fields: [ownerId], references: [id])
  ownerId   String?
  status    DecisionStatus @default(OPEN)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}
```

Add the back-relation to the `User` model (alongside its existing relations, e.g. after `links Link[]`):

```prisma
  decisions Decision[] @relation("DecisionOwner")
```

- [ ] **Step 2: Generate + apply the migration**

```bash
docker compose up -d --build
docker compose exec app npx prisma migrate dev --name add_decision
docker compose cp app:/app/prisma/migrations ./prisma/migrations
```

Verify: `docker compose exec db psql -U taproom -d taproom -c '\dt'` lists a `Decision` table.

- [ ] **Step 3: Write `src/app/api/decisions/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { USER_SUMMARY_SELECT } from "@/lib/boards";

const STATUSES = ["OPEN", "DISCUSS", "BLOCKING", "RESOLVED"] as const;
type DecisionStatus = (typeof STATUSES)[number];
function isStatus(v: unknown): v is DecisionStatus {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

export async function GET() {
  const decisions = await prisma.decision.findMany({
    where: { status: { not: "RESOLVED" } },
    include: { owner: { select: USER_SUMMARY_SELECT } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(decisions);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const title = body?.title;
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "A non-empty title is required" }, { status: 400 });
  }
  if (body?.status !== undefined && !isStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const decision = await prisma.decision.create({
    data: {
      title: title.trim(),
      note: typeof body?.note === "string" ? body.note : null,
      ownerId: body?.ownerId ?? null,
      status: body?.status ?? "OPEN",
    },
    include: { owner: { select: USER_SUMMARY_SELECT } },
  });
  return NextResponse.json(decision, { status: 201 });
}
```

- [ ] **Step 4: Write `src/app/api/decisions/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { USER_SUMMARY_SELECT } from "@/lib/boards";

const STATUSES = ["OPEN", "DISCUSS", "BLOCKING", "RESOLVED"] as const;
function isStatus(v: unknown): boolean {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.decision.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Decision not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  if (body.status !== undefined && !isStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const decision = await prisma.decision.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.note !== undefined && { note: body.note }),
      ...(body.ownerId !== undefined && { ownerId: body.ownerId }),
      ...(body.status !== undefined && { status: body.status }),
    },
    include: { owner: { select: USER_SUMMARY_SELECT } },
  });
  return NextResponse.json(decision);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.decision.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  await prisma.decision.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Verify via curl** (log in first with `SEED_PASSWORD` from `.env`):

```bash
# create
curl -s -X POST http://localhost:3000/api/decisions -b /tmp/c.txt -H "Content-Type: application/json" \
  -d '{"title":"Test decision","status":"DISCUSS"}'   # expect 201, owner:null, status DISCUSS
# list
curl -s http://localhost:3000/api/decisions -b /tmp/c.txt   # expect array with it, NO passwordHash
# patch → resolve drops it from the list
curl -s -X PATCH http://localhost:3000/api/decisions/<id> -b /tmp/c.txt -H "Content-Type: application/json" -d '{"status":"RESOLVED"}'
curl -s http://localhost:3000/api/decisions -b /tmp/c.txt   # expect it gone
# delete
curl -s -X DELETE http://localhost:3000/api/decisions/<id> -b /tmp/c.txt   # expect {"ok":true}
```
Also confirm `docker compose exec app npx tsc --noEmit` is clean and `grep passwordHash` on the list response finds nothing.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/app/api/decisions
git commit -m "Add Decision model and /api/decisions CRUD routes"
```

---

### Task D2: Logo asset + rebuild HomeView to match the mockup

**Files:**
- Create: `public/assets/siply-logo-rating.png` (copied from `docs/mockups/assets/`)
- Create: `src/components/Home/DecisionsPanel.tsx`
- Rewrite: `src/components/Home/HomeView.tsx`

**Interfaces:**
- Consumes: `GET/POST/PATCH/DELETE /api/decisions` (Task D1), `GET /api/users` (existing), `POST /api/cards` (existing, for quick capture).
- Produces: Home rendered as `home-showcase` grid = `DecisionsPanel` + fun panel, above the quick-capture panel. Matches the mockup's `#view-home`.

- [ ] **Step 1: Copy the logo asset into `public/`**

```bash
mkdir -p public/assets
cp docs/mockups/assets/siply-logo-rating.png public/assets/siply-logo-rating.png
```

(Next.js serves `public/assets/siply-logo-rating.png` at `/assets/siply-logo-rating.png`.)

- [ ] **Step 2: Write `src/components/Home/DecisionsPanel.tsx`**

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";

type User = { id: string; username: string; displayName: string; avatarColor: string };
type Status = "OPEN" | "DISCUSS" | "BLOCKING" | "RESOLVED";
type Decision = {
  id: string;
  title: string;
  note: string | null;
  status: Status;
  owner: User | null;
};

const STATUS_PILL: Record<Status, string> = {
  OPEN: "pending",
  DISCUSS: "warn",
  BLOCKING: "bad",
  RESOLVED: "good",
};
const STATUS_LABEL: Record<Status, string> = {
  OPEN: "Open",
  DISCUSS: "Discuss",
  BLOCKING: "Blocking",
  RESOLVED: "Resolved",
};

export default function DecisionsPanel() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState<Status>("OPEN");
  const [note, setNote] = useState("");

  async function load() {
    const res = await fetch("/api/decisions");
    setDecisions(await res.json());
  }

  useEffect(() => {
    load();
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setOwnerId("");
    setStatus("OPEN");
    setNote("");
    setShowForm(false);
  }

  function startEdit(d: Decision) {
    setEditingId(d.id);
    setTitle(d.title);
    setOwnerId(d.owner?.id ?? "");
    setStatus(d.status);
    setNote(d.note ?? "");
    setShowForm(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = { title, ownerId: ownerId || null, status, note: note || null };
    if (editingId) {
      const res = await fetch(`/api/decisions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setDecisions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } else {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setDecisions((prev) => [...prev, created]);
    }
    resetForm();
  }

  async function resolve(id: string) {
    await fetch(`/api/decisions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    setDecisions((prev) => prev.filter((d) => d.id !== id)); // resolved drops off the "needed" list
  }

  async function remove(id: string) {
    await fetch(`/api/decisions/${id}`, { method: "DELETE" });
    setDecisions((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <section className="panel decision-panel">
      <div className="panel-head-row">
        <h2>
          Decisions needed <span className="panel-count">· {decisions.length}</span>
        </h2>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {showForm && (
        <form className="decision-form" onSubmit={save}>
          <div className="decision-form-grid">
            <input
              className="decision-input"
              placeholder="Decision title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select className="decision-select" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Owner…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
            <select className="decision-select" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="OPEN">Open</option>
              <option value="DISCUSS">Discuss</option>
              <option value="BLOCKING">Blocking</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
          <textarea
            className="decision-textarea"
            placeholder="What needs deciding?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="decision-form-actions">
            <button className="btn-secondary" type="button" onClick={resetForm}>
              Cancel
            </button>
            <button className="btn-primary" type="submit">
              {editingId ? "Save changes" : "Save decision"}
            </button>
          </div>
        </form>
      )}

      <div className="decision-list">
        {decisions.length === 0 && <p className="column-empty">No decisions to make right now.</p>}
        {decisions.map((d) => (
          <article className="decision-item" key={d.id}>
            <div>
              <p className="decision-title">{d.title}</p>
              <p className="decision-meta">
                {d.owner ? `Owner: ${d.owner.displayName.split(" ")[0]}` : "Unassigned"}
                {d.note ? ` · ${d.note}` : ""}
              </p>
            </div>
            <div className="decision-side">
              <span className={`pill ${STATUS_PILL[d.status]} decision-status`}>{STATUS_LABEL[d.status]}</span>
              <div className="decision-actions">
                <button className="icon-btn" type="button" aria-label="Edit decision" onClick={() => startEdit(d)}>
                  ✎
                </button>
                <button className="icon-btn" type="button" aria-label="Resolve decision" onClick={() => resolve(d.id)}>
                  ✓
                </button>
                <button
                  className="icon-btn is-danger"
                  type="button"
                  aria-label="Delete decision"
                  onClick={() => remove(d.id)}
                >
                  ×
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Rewrite `src/components/Home/HomeView.tsx`** to match the mockup

```tsx
"use client";

import { useState, type FormEvent } from "react";
import type { BoardType } from "@/lib/boards";
import DecisionsPanel from "./DecisionsPanel";

const TODAY = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function HomeView() {
  const [title, setTitle] = useState("");
  const [captureType, setCaptureType] = useState<BoardType>("TASK");
  const [flash, setFlash] = useState<string | null>(null);

  async function handleCapture(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardType: captureType, title }),
    });
    if (res.ok) {
      setTitle("");
      setFlash("Added to the board.");
      setTimeout(() => setFlash(null), 2500);
    }
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">{TODAY}</p>
          <h1>Morning, crew</h1>
        </div>
      </header>
      <p className="page-purpose">
        Start here — capture what&apos;s on your mind and keep the important decisions moving.
      </p>

      <div className="capture-panel">
        <div>
          <h2>Got something on your mind?</h2>
          <p className="panel-note">
            {flash ?? "Capture it before it disappears."}
          </p>
        </div>
        <form onSubmit={handleCapture} className="capture-row">
          <input
            className="capture-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Map pins overlap when zoomed in on Manchester"
          />
          <select
            className="capture-select"
            value={captureType}
            onChange={(e) => setCaptureType(e.target.value as BoardType)}
          >
            <option value="FEATURE">Feature idea</option>
            <option value="BUG">Bug</option>
            <option value="TASK">Task</option>
          </select>
          <button className="btn-primary" type="submit">
            Add card
          </button>
        </form>
      </div>

      <div className="home-showcase">
        <DecisionsPanel />
        <section className="fun-panel" aria-label="Siply">
          <div className="logo-stage" aria-hidden="true">
            <span className="logo-ring" />
            <span className="logo-ring is-inner" />
            <span className="logo-tick tick-a" />
            <span className="logo-tick tick-b" />
            <span className="logo-tick tick-c" />
            <span className="logo-tick tick-d" />
            <img className="siply-logo-hero" src="/assets/siply-logo-rating.png" alt="" />
          </div>
          <div className="fun-copy">
            <div>
              <p className="fun-kicker">Siply HQ</p>
              <p className="fun-title">Keep it moving</p>
            </div>
            <span className="fun-chip">Internal hub</span>
          </div>
        </section>
      </div>
    </section>
  );
}
```

Note: `src/app/page.tsx` already renders `<HomeView />` — no change needed there. The old `/api/home` route is left in place (harmless, now unused); removing it is optional and out of scope here.

- [ ] **Step 4: Verify**

```bash
docker compose up -d --build
docker compose exec app npx tsc --noEmit   # clean
docker compose exec app npm run lint        # clean
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/assets/siply-logo-rating.png  # 200
```

Browser checklist (needs human): log in → Home shows the date eyebrow + "Morning, crew", the quick-capture panel, and below it a 2-column `home-showcase` with the Decisions panel (empty-state, "+ New" reveals the form; add/edit/resolve/delete work and persist across refresh) on the left and the animated Siply-logo fun panel on the right. Compare side-by-side with the mockup's `#view-home`.

- [ ] **Step 5: Commit**

```bash
git add public/assets src/components/Home/DecisionsPanel.tsx src/components/Home/HomeView.tsx
git commit -m "Rebuild Home to match mockup: decisions panel + fun panel in home-showcase grid"
```

---

## Self-Review Notes

- Spec coverage: Decisions model+API (D1), logo asset + faithful Home rebuild with `home-showcase`/decisions/fun panels (D2). Quick capture retained and wired to `/api/cards`. Empty state for decisions (no seed). All mockup class names reused; no new CSS.
- Constraints honored: `USER_SUMMARY_SELECT` on every owner embed; no `await`-in-setter (all `const x = await …; setState(…)`); `await params` in the `[id]` route; new routes auto-protected by middleware, POST checks `getCurrentUser()`.
- Known trade-off (per user's "match mockup exactly"): the previous my-open-cards/due-soon/recently-completed/quick-links panels are removed from Home; `/api/home` stays but is unused.

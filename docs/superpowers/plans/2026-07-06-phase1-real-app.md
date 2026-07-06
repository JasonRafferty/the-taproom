# Phase 1 Real App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the static HTML mockup into a real Next.js + Postgres app: working auth, Home, and the three boards (Bugs/Features/Tasks) with drag-and-drop, card modal, and comments — Resources/Usage stubbed as "in development," everything running in Docker.

**Architecture:** Next.js App Router (TypeScript) serves both UI and API routes. Postgres via Prisma is the only datastore. Hand-rolled session auth (bcrypt + HMAC-signed cookie) protects every route via middleware. The mockup's CSS is ported near-verbatim; its markup is rebuilt as React components wired to real fetch calls instead of in-browser JS state.

**Tech Stack:** Next.js (App Router) + React + TypeScript, PostgreSQL, Prisma, bcryptjs, plain CSS (no Tailwind), Docker Compose (dev mode).

**Spec:** `docs/superpowers/specs/2026-07-06-phase1-real-app-design.md` (this plan implements it in full). Also see `docs/superpowers/specs/2026-07-03-the-taproom-design.md` and `docs/superpowers/specs/2026-07-04-board-card-interactions-design.md` for background context the design spec narrows.

## Global Constraints

- Install `next`, `react`, `react-dom`, `@prisma/client`, `bcryptjs`, `prisma`, `typescript`, `tsx`, and `@types/*` via `npm install <pkg>@latest` — never hand-write version numbers into `package.json`; let npm resolve and pin them in `package-lock.json`.
- This project is on Prisma 7: `PrismaClient` requires an explicit driver adapter (`@prisma/adapter-pg`, installed in Task 3) — `new PrismaClient()` with no arguments throws. The CLI (`migrate`, `studio`) reads connection info from `prisma.config.ts`, not from `schema.prisma`'s `datasource.url`. Every place that needs a Prisma client imports the one singleton from `@/lib/db` (or `../src/lib/db` from scripts outside Next's path-alias resolution) rather than constructing a new one.
- TypeScript throughout. Path alias `@/*` → `./src/*`.
- Styling: plain CSS ported from the mockup into `src/app/globals.css`. No Tailwind, no CSS-in-JS.
- Auth: hand-rolled bcrypt + HMAC-SHA256-signed session cookie, implemented with the **Web Crypto API only** (`crypto.subtle`, `btoa`) — never Node's `crypto` module or `Buffer`. `src/middleware.ts` runs in the Edge runtime, which has neither; the same `src/lib/session.ts` code is shared between middleware (Edge) and route handlers (Node), so it must work in both.
- Middleware file location: `src/middleware.ts`, **not** a repo-root `middleware.ts`. This project uses the `src/` directory layout, and this Next.js version resolves middleware relative to that directory — a root-level `middleware.ts` is silently never invoked (no error, just a no-op).
- Next.js dynamic route handlers: `params` is a `Promise` in this Next.js version — always `const { id } = await params;`, never destructure `params` directly.
- No automated test framework this pass. Every task's verification step is a manual command (curl, psql, or a browser checklist for UI tasks) — run it and confirm the stated expected output before moving on.
- Docker: dev-mode only — the `app` container runs `next dev`, not a production build. **No source bind-mount**: this environment's Docker Desktop cannot bind-mount its WSL distro (confirmed broken even for a fresh scratch file, after restarting Docker Desktop and re-checking the WSL Integration toggle), so source is copied into the image at build time instead of live-mounted. This means **every code change requires `docker compose up -d --build`** (not `docker compose restart app`) to take effect — every task's verification steps in this plan already use `--build` for this reason. No production Dockerfile beyond this.
- Seed data: exactly 4 users (`ashoka`, `anulome`, `arvin`, `jason`), one shared password from the `SEED_PASSWORD` env var (no default value committed anywhere). No cards, comments, or links are seeded.
- Cut entirely: no Environments view, model, or route.
- Resources and Usage: a nav link and a page that renders "In development" — no data model, no CRUD.
- Package manager: npm (not pnpm/yarn).

---

## File Structure

```
the-taproom/
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── .env.example              # committed template; real .env is gitignored
├── package.json
├── tsconfig.json
├── next.config.js
├── src/middleware.ts           # route protection (Edge runtime)
├── prisma.config.ts            # Prisma 7 CLI config (datasource URL, migrations path)
├── prisma/
│   ├── schema.prisma          # User, Card, Comment, Link models
│   └── seed.ts                # creates 4 users only
└── src/
    ├── lib/
    │   ├── db.ts               # Prisma client singleton
    │   ├── session.ts          # sign/verify session cookie (Web Crypto)
    │   ├── auth.ts             # getCurrentUser() for route handlers/server components
    │   └── boards.ts           # board type/column/slug/empty-message constants
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── LoginForm.tsx
    │   ├── Board/
    │   │   ├── BoardView.tsx
    │   │   ├── CardModal.tsx
    │   │   └── CommentThread.tsx
    │   └── Home/
    │       └── HomeView.tsx
    └── app/
        ├── layout.tsx
        ├── globals.css
        ├── page.tsx                        # Home
        ├── login/page.tsx
        ├── resources/page.tsx               # placeholder
        ├── usage/page.tsx                   # placeholder
        ├── boards/[slug]/page.tsx
        └── api/
            ├── auth/login/route.ts
            ├── auth/logout/route.ts
            ├── users/route.ts
            ├── home/route.ts
            ├── cards/route.ts
            ├── cards/[id]/route.ts
            └── cards/[id]/comments/route.ts
            └── comments/[id]/route.ts       # (src/app/api/comments/[id]/route.ts)
```

**Parallelization note:** Tasks 5–8 (auth + all API routes) and Task 9 (CSS/layout/Sidebar/login page/placeholder pages) touch entirely disjoint files. Task 9 only depends on the *contract* `getCurrentUser(): Promise<User | null>` from Task 5 and the `POST /api/auth/login` request/response shape, both fully specified below — it can be dispatched to a subagent in parallel with Tasks 5–8 rather than waiting on them. Tasks 10–12 must run after both branches land, since Board/Home UI calls the real API and layout.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `src/app/layout.tsx`, `src/app/page.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Produces: a working `npm run dev` Next.js App Router project other tasks build into.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "the-taproom",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate",
    "prisma:seed": "tsx prisma/seed.ts",
    "prisma:studio": "prisma studio"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install next@latest react@latest react-dom@latest @prisma/client@latest bcryptjs@latest
npm install -D typescript@latest @types/node@latest @types/react@latest @types/react-dom@latest @types/bcryptjs@latest prisma@latest tsx@latest eslint@latest eslint-config-next@latest
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```

- [ ] **Step 5: Write `src/app/layout.tsx`**

```tsx
import type { ReactNode } from "react";

export const metadata = { title: "The Taproom" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Write `src/app/page.tsx`**

```tsx
export default function Placeholder() {
  return <p>The Taproom — scaffold OK.</p>;
}
```

- [ ] **Step 7: Update `.gitignore`**

Read the existing `.gitignore` and append (don't duplicate any lines already present):

```
# Next.js / Node
node_modules/
.next/
.env
```

- [ ] **Step 8: Verify**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000 | grep -o "scaffold OK"
kill %1
```

Expected output: `scaffold OK`

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.js src/app/layout.tsx src/app/page.tsx .gitignore
git commit -m "Scaffold Next.js + TypeScript app"
```

---

### Task 2: Docker Compose (dev mode)

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example`

**Interfaces:**
- Consumes: `package.json` from Task 1.
- Produces: `docker compose up` running both `app` (Next.js, port 3000) and `db` (Postgres, port 5432) services. `DATABASE_URL=postgresql://taproom:taproom@db:5432/taproom` available to the `app` container. `SESSION_SECRET` and `SEED_PASSWORD` env vars passed through from a local `.env` file (gitignored).

- [ ] **Step 1: Write `Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

The `prisma generate` step must come after `COPY . .`, not rely on `npm install`'s postinstall hook — at `npm install` time only `package.json`/`package-lock.json` exist in the build context, so `prisma/schema.prisma` isn't there yet and generation silently no-ops. `prisma generate` only reads the schema to produce client code; it doesn't connect to a database, so the placeholder `DATABASE_URL` is fine here.

- [ ] **Step 2: Write `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: taproom
      POSTGRES_PASSWORD: taproom
      POSTGRES_DB: taproom
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://taproom:taproom@db:5432/taproom
      SESSION_SECRET: ${SESSION_SECRET}
      SEED_PASSWORD: ${SEED_PASSWORD}
      NODE_ENV: development
    ports:
      - "3000:3000"
    command: npm run dev

volumes:
  db-data:
```

- [ ] **Step 3: Write `.dockerignore`**

```
node_modules
.next
.git
.env
```

- [ ] **Step 4: Write `.env.example`**

```
SESSION_SECRET=changeme-generate-a-long-random-string
SEED_PASSWORD=changeme-pick-a-real-shared-password
```

- [ ] **Step 5: Create your local `.env`** (not committed — copy the example and fill in real values)

```bash
cp .env.example .env
```

Edit `.env` and replace both placeholder values with real ones (e.g. `openssl rand -hex 32` for `SESSION_SECRET`).

- [ ] **Step 6: Verify**

```bash
docker compose up -d --build
sleep 5
docker compose ps
curl -s http://localhost:3000 | grep -o "scaffold OK"
docker compose down
```

Expected: `docker compose ps` shows both `app` and `db` as `running`; curl prints `scaffold OK`.

- [ ] **Step 7: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore .env.example
git commit -m "Add Docker Compose dev environment"
```

---

### Task 3: Prisma schema + client

**Files:**
- Create: `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/db.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` env var from Task 2.
- Produces: `User`, `Card`, `Comment`, `Link` Prisma models; `prisma` client singleton exported from `@/lib/db`.

**Note on Prisma 7:** this project is on Prisma 7 (installed via `@latest` in Task 1), which changed two things from older Prisma versions: (1) the CLI no longer reads `datasource.url` out of `schema.prisma` — it needs a `prisma.config.ts` file instead; (2) `PrismaClient` no longer accepts zero-argument construction — it requires an explicit driver adapter. Both are handled in the steps below.

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

enum BoardType {
  BUG
  FEATURE
  TASK
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

model User {
  id            String    @id @default(cuid())
  username      String    @unique
  passwordHash  String
  displayName   String
  avatarColor   String
  createdCards  Card[]    @relation("CardCreatedBy")
  assignedCards Card[]    @relation("CardAssignee")
  comments      Comment[]
  links         Link[]
  createdAt     DateTime  @default(now())
}

model Card {
  id          String    @id @default(cuid())
  boardType   BoardType
  column      String
  title       String
  description String?
  assignee    User?     @relation("CardAssignee", fields: [assigneeId], references: [id])
  assigneeId  String?
  priority    Priority?
  dueDate     DateTime?
  archived    Boolean   @default(false)
  createdBy   User      @relation("CardCreatedBy", fields: [createdById], references: [id])
  createdById String
  comments    Comment[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Comment {
  id        String   @id @default(cuid())
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  cardId    String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  text      String
  createdAt DateTime @default(now())
}

model Link {
  id        String   @id @default(cuid())
  title     String
  url       String
  category  String
  addedBy   User     @relation(fields: [addedById], references: [id])
  addedById String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Write `prisma.config.ts`** (repo root, next to `package.json`)

Prisma 7's CLI (`migrate`, `studio`, etc.) reads connection info from this file, not from `schema.prisma`. `docker-compose.yml` already injects `DATABASE_URL` directly as a container environment variable, so no `.env`-loading step is needed here — don't add a `dotenv` import.

```ts
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
  },
});
```

- [ ] **Step 3: Install the Postgres driver adapter**

Prisma 7 requires a driver adapter — `new PrismaClient()` with no arguments throws. Install:

```bash
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

- [ ] **Step 4: Write `src/lib/db.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: Bring up Docker and run the migration**

```bash
docker compose up -d --build
docker compose exec app npx prisma migrate dev --name init
```

- [ ] **Step 6: Verify**

```bash
docker compose exec db psql -U taproom -d taproom -c '\dt'
```

Expected: a table list including `User`, `Card`, `Comment`, `Link`, `_prisma_migrations`.

Also verify the adapter-based client actually works (this is the real deliverable — a raw `psql` check alone does not exercise `PrismaClient`). `tsx -e` has a CJS/ESM interop quirk that hides named exports, so use a small script file instead of an inline `-e` one-liner:

```bash
cat > /tmp/verify-prisma.mjs <<'EOF'
import { prisma } from "/app/src/lib/db.ts";
const users = await prisma.user.findMany();
console.log(users);
await prisma.$disconnect();
EOF
docker compose cp /tmp/verify-prisma.mjs app:/app/verify-prisma.mjs
docker compose exec app npx tsx /app/verify-prisma.mjs
docker compose exec app rm -f /app/verify-prisma.mjs
```

Expected: `[]` (empty array — no users seeded yet), with no thrown error.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma prisma.config.ts prisma/migrations src/lib/db.ts
git commit -m "Add Prisma schema (User, Card, Comment, Link)"
```

---

### Task 4: Seed script

**Files:**
- Create: `prisma/seed.ts`

**Interfaces:**
- Consumes: `SEED_PASSWORD` env var (Task 2), `User` model (Task 3), `prisma` client singleton from `@/lib/db` (Task 3) — imported by relative path (`../src/lib/db`) since this script runs via `tsx`, not through Next.js's path-alias resolution.
- Produces: 4 seeded users (`ashoka`, `anulome`, `arvin`, `jason`), all sharing one bcrypt-hashed password.

- [ ] **Step 1: Write `prisma/seed.ts`**

```ts
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const SHARED_PASSWORD = process.env.SEED_PASSWORD;
if (!SHARED_PASSWORD) {
  throw new Error("SEED_PASSWORD env var is required to seed users");
}

const FOUNDERS = [
  { username: "ashoka", displayName: "Ashoka Mullassery", avatarColor: "#D0FF14" },
  { username: "anulome", displayName: "Anulome Kishore", avatarColor: "#6C244C" },
  { username: "arvin", displayName: "Arvin Razavi", avatarColor: "#F2B84B" },
  { username: "jason", displayName: "Jason Rafferty", avatarColor: "#6FCF97" },
];

async function main() {
  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, 10);
  for (const founder of FOUNDERS) {
    await prisma.user.upsert({
      where: { username: founder.username },
      update: {},
      create: { ...founder, passwordHash },
    });
  }
  console.log(`Seeded ${FOUNDERS.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run the seed**

```bash
docker compose exec app npm run prisma:seed
```

Expected output: `Seeded 4 users.`

- [ ] **Step 3: Verify**

```bash
docker compose exec db psql -U taproom -d taproom -c 'SELECT username, "displayName" FROM "User" ORDER BY username;'
```

Expected: 4 rows — `anulome`, `arvin`, `ashoka`, `jason` with their display names.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "Add seed script for the 4 founder accounts"
```

---

### Task 5: Auth (session lib, login/logout routes, middleware)

**Files:**
- Create: `src/lib/session.ts`, `src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/middleware.ts`

**Interfaces:**
- Consumes: `User` model (Task 3), `SESSION_SECRET` env var (Task 2).
- Produces:
  - `createSessionToken(userId: string): Promise<string>`, `verifySessionToken(token): Promise<string | null>`, `SESSION_COOKIE_NAME` from `@/lib/session`.
  - `getCurrentUser(): Promise<User | null>` from `@/lib/auth` — this is the contract Task 9 builds against in parallel.
  - `POST /api/auth/login` — body `{ username: string, password: string }` → `200 { ok: true, displayName: string }` + `Set-Cookie` on success, `401 { error: string }` on failure.
  - `POST /api/auth/logout` — clears the cookie, redirects to `/login`.
  - `src/middleware.ts` — redirects unauthenticated page requests to `/login`, returns `401` JSON for unauthenticated `/api/*` requests. `/login` and `/api/auth/login` are public.

- [ ] **Step 1: Write `src/lib/session.ts`**

```ts
export const SESSION_COOKIE_NAME = "taproom_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function getSecretKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is required");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

export async function createSessionToken(userId: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  const key = await getSecretKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${bufferToBase64Url(signature)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAtStr, signatureB64] = parts;
  const key = await getSecretKey();
  const expectedSignature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${userId}.${expiresAtStr}`)
  );
  const expectedB64 = bufferToBase64Url(expectedSignature);
  if (!timingSafeEqual(signatureB64, expectedB64)) return null;
  const expiresAt = Number(expiresAtStr);
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return null;
  return userId;
}
```

- [ ] **Step 2: Write `src/lib/auth.ts`**

```ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}
```

- [ ] **Step 3: Write `src/app/api/auth/login/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

// Bcrypt hash of an arbitrary fixed string, unrelated to any real password.
// Used only to keep bcrypt.compare's timing constant when the username
// doesn't exist, so login can't be used to enumerate valid usernames.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8jL2/hlIeQ6R4kFtVi.EM2X3jSt4nO";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = body?.username;
  const password = body?.password;
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = await createSessionToken(user.id);
  const response = NextResponse.json({ ok: true, displayName: user.displayName });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
```

- [ ] **Step 4: Write `src/app/api/auth/logout/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
```

- [ ] **Step 5: Write `src/middleware.ts`** (next to `src/app/`, not the repo root — this Next.js version resolves middleware relative to the `src/` directory)

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userId = await verifySessionToken(token);
  if (!userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 6: Verify**

```bash
docker compose up -d --build
sleep 3

# Unauthenticated request redirects to /login
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
# Expected: 307 (or 308)

# Login with a seeded user (replace <password> with your real SEED_PASSWORD value)
curl -s -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"jason","password":"<password>"}' \
  -c /tmp/taproom-cookies.txt
# Expected: HTTP/1.1 200, body {"ok":true,"displayName":"Jason Rafferty"}, and a Set-Cookie header

# Authenticated request now succeeds
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/ -b /tmp/taproom-cookies.txt
# Expected: 200

# Wrong password is rejected
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"username":"jason","password":"wrong"}'
# Expected: 401
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/session.ts src/lib/auth.ts src/app/api/auth src/middleware.ts
git commit -m "Add hand-rolled session auth and route protection"
```

---

### Task 6: Board constants + Card & User API routes

**Files:**
- Create: `src/lib/boards.ts`, `src/app/api/cards/route.ts`, `src/app/api/cards/[id]/route.ts`, `src/app/api/users/route.ts`

**Interfaces:**
- Consumes: `Card`/`User` models (Task 3), `getCurrentUser()` (Task 5).
- Produces:
  - `BOARD_COLUMNS`, `TERMINAL_COLUMN`, `BOARD_LABELS`, `BOARD_PURPOSE`, `BOARD_SLUGS`, `EMPTY_COLUMN_MESSAGE`, `isBoardType()`, `slugToBoardType()` from `@/lib/boards`.
  - `GET /api/cards?boardType=BUG|FEATURE|TASK` → array of non-archived cards with `assignee`/`createdBy` included.
  - `POST /api/cards` — body `{ boardType, title, description?, assigneeId?, priority?, dueDate? }` → `201` created card (column defaults to the board's first column).
  - `GET /api/cards/:id` → single card with `assignee`, `createdBy`, `comments` (with `author`).
  - `PATCH /api/cards/:id` — body: any subset of `{ column, title, description, assigneeId, priority, dueDate, archived }` → `200` updated card.
  - `GET /api/users` → array of `{ id, username, displayName, avatarColor }`.

- [ ] **Step 1: Write `src/lib/boards.ts`**

```ts
export type BoardType = "BUG" | "FEATURE" | "TASK";

export const BOARD_COLUMNS: Record<BoardType, string[]> = {
  BUG: ["To Do", "In Progress", "Ready to Test", "Ready for Release", "Released"],
  FEATURE: ["To Do", "In Progress", "Ready to Test", "Ready for Release", "Released"],
  TASK: ["To Do", "In Progress", "Done"],
};

export const TERMINAL_COLUMN: Record<BoardType, string> = {
  BUG: "Released",
  FEATURE: "Released",
  TASK: "Done",
};

export const BOARD_LABELS: Record<BoardType, string> = {
  BUG: "Bugs",
  FEATURE: "Features",
  TASK: "Tasks",
};

export const BOARD_PURPOSE: Record<BoardType, string> = {
  BUG: "Something broken in the live product? Log it, track it, watch it through to release.",
  FEATURE: "New ideas and in-progress features, from first idea to shipped.",
  TASK: "Everything else — admin, legal, funding, marketing, ops.",
};

export const BOARD_SLUGS: Record<BoardType, string> = {
  BUG: "bugs",
  FEATURE: "features",
  TASK: "tasks",
};

export const EMPTY_COLUMN_MESSAGE: Record<BoardType, Record<string, string>> = {
  BUG: {
    "To Do": "No bugs logged yet.",
    "In Progress": "Nothing being worked on yet.",
    "Ready to Test": "Nothing waiting on testing yet.",
    "Ready for Release": "Nothing ready to ship yet.",
    Released: "Nothing released yet — Siply hasn't launched.",
  },
  FEATURE: {
    "To Do": "No feature ideas logged yet.",
    "In Progress": "Nothing being worked on yet.",
    "Ready to Test": "Nothing waiting on testing yet.",
    "Ready for Release": "Nothing ready to ship yet.",
    Released: "Nothing released yet — Siply hasn't launched.",
  },
  TASK: {
    "To Do": "No tasks logged yet.",
    "In Progress": "Nothing being worked on yet.",
    Done: "Nothing completed yet.",
  },
};

export function isBoardType(value: string): value is BoardType {
  return value === "BUG" || value === "FEATURE" || value === "TASK";
}

export function slugToBoardType(slug: string): BoardType | null {
  const entry = (Object.entries(BOARD_SLUGS) as [BoardType, string][]).find(([, s]) => s === slug);
  return entry ? entry[0] : null;
}
```

- [ ] **Step 2: Write `src/app/api/cards/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isBoardType, BOARD_COLUMNS } from "@/lib/boards";

export async function GET(request: NextRequest) {
  const boardType = request.nextUrl.searchParams.get("boardType");
  if (!boardType || !isBoardType(boardType)) {
    return NextResponse.json(
      { error: "boardType query param must be BUG, FEATURE, or TASK" },
      { status: 400 }
    );
  }
  const cards = await prisma.card.findMany({
    where: { boardType, archived: false },
    include: { assignee: true, createdBy: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(cards);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const boardType = body?.boardType;
  const title = body?.title;
  if (!boardType || !isBoardType(boardType) || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "boardType and non-empty title are required" }, { status: 400 });
  }

  const card = await prisma.card.create({
    data: {
      boardType,
      title: title.trim(),
      column: BOARD_COLUMNS[boardType][0],
      description: body?.description ?? null,
      assigneeId: body?.assigneeId ?? null,
      priority: body?.priority ?? null,
      dueDate: body?.dueDate ? new Date(body.dueDate) : null,
      createdById: user.id,
    },
    include: { assignee: true, createdBy: true },
  });
  return NextResponse.json(card, { status: 201 });
}
```

- [ ] **Step 3: Write `src/app/api/cards/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BOARD_COLUMNS } from "@/lib/boards";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      assignee: true,
      createdBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  return NextResponse.json(card);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  if (body.column !== undefined && !BOARD_COLUMNS[existing.boardType].includes(body.column)) {
    return NextResponse.json({ error: `Invalid column for ${existing.boardType} board` }, { status: 400 });
  }

  const card = await prisma.card.update({
    where: { id },
    data: {
      ...(body.column !== undefined && { column: body.column }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.archived !== undefined && { archived: body.archived }),
    },
    include: { assignee: true, createdBy: true },
  });
  return NextResponse.json(card);
}
```

- [ ] **Step 4: Write `src/app/api/users/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, avatarColor: true },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json(users);
}
```

- [ ] **Step 5: Verify** (reuse the cookie jar from Task 5's Step 6)

```bash
docker compose up -d --build
sleep 3

curl -s -X POST http://localhost:3000/api/cards -b /tmp/taproom-cookies.txt \
  -H "Content-Type: application/json" -d '{"boardType":"TASK","title":"Test task"}'
# Expected: 201 body with "column":"To Do" — copy the returned "id" for the next commands

curl -s "http://localhost:3000/api/cards?boardType=TASK" -b /tmp/taproom-cookies.txt
# Expected: array containing the test task

curl -s -X PATCH http://localhost:3000/api/cards/<id> -b /tmp/taproom-cookies.txt \
  -H "Content-Type: application/json" -d '{"column":"In Progress"}'
# Expected: 200, "column":"In Progress"

curl -s http://localhost:3000/api/users -b /tmp/taproom-cookies.txt
# Expected: array of 4 users
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/boards.ts src/app/api/cards src/app/api/users
git commit -m "Add board constants and Card/User API routes"
```

---

### Task 7: Comment API routes

**Files:**
- Create: `src/app/api/cards/[id]/comments/route.ts`, `src/app/api/comments/[id]/route.ts`

**Interfaces:**
- Consumes: `Card`/`Comment` models (Task 3), `getCurrentUser()` (Task 5).
- Produces:
  - `POST /api/cards/:id/comments` — body `{ text }` → `201` created comment with `author`.
  - `DELETE /api/comments/:id` → `200 { ok: true }` (any founder can delete any comment, no ownership check).

- [ ] **Step 1: Write `src/app/api/cards/[id]/comments/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const text = body?.text;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Non-empty text is required" }, { status: 400 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const comment = await prisma.comment.create({
    data: { cardId: id, authorId: user.id, text: text.trim() },
    include: { author: true },
  });
  return NextResponse.json(comment, { status: 201 });
}
```

- [ ] **Step 2: Write `src/app/api/comments/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  await prisma.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify** (using the test card `id` from Task 6)

```bash
docker compose up -d --build
sleep 3

curl -s -X POST http://localhost:3000/api/cards/<id>/comments -b /tmp/taproom-cookies.txt \
  -H "Content-Type: application/json" -d '{"text":"hello"}'
# Expected: 201, body includes "text":"hello" and an "author" object — copy the returned comment "id"

curl -s http://localhost:3000/api/cards/<id> -b /tmp/taproom-cookies.txt
# Expected: "comments" array has length 1

curl -s -X DELETE http://localhost:3000/api/comments/<commentId> -b /tmp/taproom-cookies.txt
# Expected: 200 {"ok":true}

curl -s http://localhost:3000/api/cards/<id> -b /tmp/taproom-cookies.txt
# Expected: "comments" array is now empty
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cards/[id]/comments src/app/api/comments
git commit -m "Add comment API routes"
```

---

### Task 8: Home aggregation API route

**Files:**
- Create: `src/app/api/home/route.ts`

**Interfaces:**
- Consumes: `Card`/`Link` models (Task 3), `getCurrentUser()` (Task 5), `TERMINAL_COLUMN` (Task 6).
- Produces: `GET /api/home` → `{ myOpenCards: CardSummary[], dueSoon: CardSummary[], recentlyCompleted: CardSummary[], quickLinks: Link[] }`.

- [ ] **Step 1: Write `src/app/api/home/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TERMINAL_COLUMN } from "@/lib/boards";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [assignedCards, dueSoon, recentCandidates, quickLinks] = await Promise.all([
    prisma.card.findMany({
      where: { assigneeId: user.id, archived: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.card.findMany({
      where: { archived: false, dueDate: { not: null } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.card.findMany({
      where: { archived: false },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.link.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const myOpenCards = assignedCards.filter((card) => card.column !== TERMINAL_COLUMN[card.boardType]);
  const recentlyCompleted = recentCandidates
    .filter((card) => card.column === TERMINAL_COLUMN[card.boardType])
    .slice(0, 5);

  return NextResponse.json({ myOpenCards, dueSoon, recentlyCompleted, quickLinks });
}
```

- [ ] **Step 2: Verify** (continuing from Task 6's test card, still assigned to nobody and in "In Progress")

```bash
docker compose up -d --build
sleep 3

# Assign the test card to jason (get his id first)
docker compose exec db psql -U taproom -d taproom -t -c "SELECT id FROM \"User\" WHERE username='jason';"
curl -s -X PATCH http://localhost:3000/api/cards/<id> -b /tmp/taproom-cookies.txt \
  -H "Content-Type: application/json" -d '{"assigneeId":"<jasonId>"}'

curl -s http://localhost:3000/api/home -b /tmp/taproom-cookies.txt
# Expected: "myOpenCards" includes the test card (column "In Progress" != terminal "Done");
# "recentlyCompleted" and "quickLinks" are empty arrays

curl -s -X PATCH http://localhost:3000/api/cards/<id> -b /tmp/taproom-cookies.txt \
  -H "Content-Type: application/json" -d '{"column":"Done"}'
curl -s http://localhost:3000/api/home -b /tmp/taproom-cookies.txt
# Expected: "myOpenCards" no longer includes the test card; "recentlyCompleted" now does

# Clean up the test card
curl -s -X PATCH http://localhost:3000/api/cards/<id> -b /tmp/taproom-cookies.txt \
  -H "Content-Type: application/json" -d '{"archived":true}'
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/home
git commit -m "Add Home aggregation API route"
```

---

### Task 9: Global CSS, layout, Sidebar, login page, placeholder pages

**Files:**
- Create: `src/app/globals.css`, `src/components/Sidebar.tsx`, `src/components/LoginForm.tsx`, `src/app/login/page.tsx`, `src/app/resources/page.tsx`, `src/app/usage/page.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `getCurrentUser()` contract from Task 5 (can be built in parallel against this signature).
- Produces: app shell (Sidebar + content area) rendered for logged-in users; bare layout for `/login`. `.rail`, `.rail-link`, `.avatar`, `.panel`, `.list-item`, `.card*`, `.column*`, `.filter-chip`, `.board*`, `.modal*`, `.comment*`, `.login*` CSS classes available globally for later tasks to use.

- [ ] **Step 1: Create `src/app/globals.css`**

Open `docs/mockups/2026-07-03-taproom-mockup.html` and copy everything between the `<style>` tag on line 9 and the `</style>` tag on line 500 (the CSS rules only, not the tags themselves) into a new `src/app/globals.css`, verbatim.

Then append this addition to the end of the file (new patterns not in the original mockup — a real login page and the centered card-detail modal that replaces the mockup's unbuilt slide-over drawer):

```css

/* --- Additions for the real app (not in the original mockup) --- */

.login-page {
  max-width: 360px;
  margin: 15vh auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--mist);
}

.login-form input {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 8px 10px;
  color: var(--ink);
  font-size: 14px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 24px;
  max-width: 560px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.modal-title {
  background: transparent;
  border: none;
  color: var(--ink);
  font-size: 20px;
  font-family: var(--font-display);
  padding: 0;
}

.modal-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.modal-fields label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  color: var(--mist);
}

.modal-fields select,
.modal-fields input {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px 8px;
  color: var(--ink);
}

.modal-description {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px;
  color: var(--ink);
  min-height: 80px;
  font-family: inherit;
}

.modal-footer {
  color: var(--mist-dim);
  font-size: 12px;
}

.comment-thread {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid var(--line);
  padding-top: 14px;
}

.comment {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.comment-body {
  flex: 1;
}

.comment-meta {
  font-size: 12px;
  color: var(--mist-dim);
}

.comment-input {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px;
  color: var(--ink);
  min-height: 50px;
  font-family: inherit;
}

.rail-logout {
  margin: 0;
}

.rail-logout button {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}
```

- [ ] **Step 2: Write `src/components/Sidebar.tsx`**

```tsx
import Link from "next/link";
import { BOARD_LABELS, BOARD_SLUGS, type BoardType } from "@/lib/boards";

const BOARD_ORDER: BoardType[] = ["BUG", "FEATURE", "TASK"];

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function Sidebar({
  currentUser,
}: {
  currentUser: { displayName: string; avatarColor: string };
}) {
  return (
    <aside className="rail" aria-label="Primary navigation">
      <div className="rail-brand">
        <div>
          <p className="rail-name">The&nbsp;Taproom</p>
          <p className="rail-sub">Siply internal hub</p>
        </div>
      </div>
      <nav className="rail-nav">
        <div className="rail-group">
          <Link className="rail-link" href="/">Home</Link>
        </div>
        <div className="rail-group">
          <p className="rail-group-label">Boards</p>
          {BOARD_ORDER.map((boardType) => (
            <Link key={boardType} className="rail-link board-link" href={`/boards/${BOARD_SLUGS[boardType]}`}>
              {BOARD_LABELS[boardType]}
            </Link>
          ))}
        </div>
        <div className="rail-group">
          <Link className="rail-link" href="/resources">Resources</Link>
          <Link className="rail-link" href="/usage">Usage</Link>
        </div>
      </nav>
      <div className="rail-team">
        <p className="rail-label">Logged in as</p>
        <div className="avatars">
          <span className="avatar is-viewing" style={{ "--c": currentUser.avatarColor } as React.CSSProperties}>
            {initials(currentUser.displayName)}
          </span>
          <span className="rail-hint">{currentUser.displayName}</span>
        </div>
        <form action="/api/auth/logout" method="post" className="rail-logout">
          <button type="submit" className="rail-link">Log out</button>
        </form>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Write `src/components/LoginForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      <button className="btn-primary" type="submit">Log in</button>
    </form>
  );
}
```

- [ ] **Step 4: Write `src/app/login/page.tsx`**

```tsx
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="login-page">
      <h1>The Taproom</h1>
      <p className="page-purpose">Siply internal hub — log in to continue.</p>
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 5: Write `src/app/resources/page.tsx`**

```tsx
export default function ResourcesPage() {
  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Resources</p>
          <h1>Resources</h1>
        </div>
      </header>
      <p className="page-purpose">In development — links and notes are coming in a later phase.</p>
    </section>
  );
}
```

- [ ] **Step 6: Write `src/app/usage/page.tsx`**

```tsx
export default function UsagePage() {
  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Usage</p>
          <h1>Usage</h1>
        </div>
      </header>
      <p className="page-purpose">In development — live and validation metrics are coming in a later phase.</p>
    </section>
  );
}
```

- [ ] **Step 7: Rewrite `src/app/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata = { title: "The Taproom" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="app">
            <Sidebar currentUser={{ displayName: user.displayName, avatarColor: user.avatarColor }} />
            <main className="content">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Verify**

Open `http://localhost:3000` in a browser (log in first at `/login` with a seeded username and your `SEED_PASSWORD` value if redirected there). Confirm:
- The sidebar renders with Home / Bugs / Features / Tasks / Resources / Usage links and matches the mockup's visual style (dark charcoal rail, lime/magenta accents).
- `/resources` and `/usage` show "In development" placeholder pages.
- Clicking "Log out" returns you to `/login`, and `/` then redirects back to `/login`.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/components/Sidebar.tsx src/components/LoginForm.tsx src/app/login src/app/resources src/app/usage src/app/layout.tsx
git commit -m "Add global styles, app shell, login page, and placeholder views"
```

---

### Task 10: Board page UI (columns, cards, filters, search, drag-and-drop)

**Files:**
- Create: `src/app/boards/[slug]/page.tsx`, `src/components/Board/BoardView.tsx`

**Interfaces:**
- Consumes: `GET /api/cards`, `PATCH /api/cards/:id`, `POST /api/cards`, `GET /api/users` (Task 6), `getCurrentUser()` (Task 5), board constants (Task 6), CSS classes (Task 9).
- Produces: a working board at `/boards/bugs`, `/boards/features`, `/boards/tasks` with a temporary inline card-detail placeholder (full modal arrives in Task 11).

- [ ] **Step 1: Write `src/app/boards/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { slugToBoardType, BOARD_LABELS, BOARD_PURPOSE } from "@/lib/boards";
import { getCurrentUser } from "@/lib/auth";
import BoardView from "@/components/Board/BoardView";

export default async function BoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const boardType = slugToBoardType(slug);
  if (!boardType) notFound();

  const user = await getCurrentUser();
  if (!user) notFound(); // unreachable in practice — middleware redirects unauthenticated requests first

  return (
    <BoardView
      boardType={boardType}
      label={BOARD_LABELS[boardType]}
      purpose={BOARD_PURPOSE[boardType]}
      currentUserId={user.id}
    />
  );
}
```

- [ ] **Step 2: Write `src/components/Board/BoardView.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { BOARD_COLUMNS, EMPTY_COLUMN_MESSAGE, type BoardType } from "@/lib/boards";

type User = { id: string; username: string; displayName: string; avatarColor: string };

export type Card = {
  id: string;
  boardType: BoardType;
  column: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | null;
  dueDate: string | null;
  assignee: User | null;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function BoardView({
  boardType,
  label,
  purpose,
  currentUserId,
}: {
  boardType: BoardType;
  label: string;
  purpose: string;
  currentUserId: string;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    const res = await fetch(`/api/cards?boardType=${boardType}`);
    setCards(await res.json());
    setLoading(false);
  }, [boardType]);

  useEffect(() => {
    setFilter("all");
    setSearch("");
    setLoading(true);
    loadCards();
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, [boardType, loadCards]);

  const filtered = useMemo(
    () =>
      cards.filter((card) => {
        if (filter !== "all" && card.assignee?.id !== filter) return false;
        if (search && !card.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [cards, filter, search]
  );

  async function moveCard(cardId: string, column: string) {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, column } : c)));
    await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column }),
    });
  }

  async function createCard() {
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardType, title: `Untitled ${label.slice(0, -1)}` }),
    });
    setCards((prev) => [...prev, await res.json()]);
  }

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  if (loading) return <p className="page-purpose">Loading…</p>;

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Board</p>
          <h1>{label}</h1>
        </div>
        <button className="btn-primary" type="button" onClick={createCard}>+ New card</button>
      </header>
      <p className="page-purpose">{purpose}</p>

      <div className="board-toolbar">
        <div className="filter-row">
          <button className={`filter-chip ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")} type="button">
            All
          </button>
          <button
            className={`filter-chip ${filter === currentUserId ? "is-active" : ""}`}
            onClick={() => setFilter(currentUserId)}
            type="button"
          >
            Mine
          </button>
          {users.map((u) => (
            <button
              key={u.id}
              className={`filter-chip ${filter === u.id ? "is-active" : ""}`}
              onClick={() => setFilter(u.id)}
              type="button"
            >
              <span className="avatar" style={{ "--c": u.avatarColor } as React.CSSProperties}>
                {initials(u.displayName)}
              </span>{" "}
              {u.displayName.split(" ")[0]}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="Search this board…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="board-scroll">
        <div className="board">
          {BOARD_COLUMNS[boardType].map((column) => {
            const rawColumnCards = cards.filter((c) => c.column === column);
            const columnCards = filtered.filter((c) => c.column === column);
            return (
              <div
                className="column"
                key={column}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const cardId = e.dataTransfer.getData("text/plain");
                  if (cardId) moveCard(cardId, column);
                }}
              >
                <div className="column-head">
                  <span className="column-title">{column}</span>
                  <span className="column-count">{columnCards.length}</span>
                </div>
                {rawColumnCards.length === 0 && (
                  <p className="column-empty">{EMPTY_COLUMN_MESSAGE[boardType][column]}</p>
                )}
                {rawColumnCards.length > 0 && columnCards.length === 0 && (
                  <p className="column-empty-hint is-visible">No matching cards.</p>
                )}
                {columnCards.map((card) => (
                  <div
                    key={card.id}
                    className={`card ${card.priority ? `pri-${card.priority.toLowerCase()}` : ""}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <p className="card-title">{card.title}</p>
                    <div className="card-meta">
                      <span className="card-meta-left">
                        {card.priority === "HIGH" && <span className="card-priority">High</span>}
                        {card.dueDate && (
                          <span className="card-due">Due {new Date(card.dueDate).toLocaleDateString()}</span>
                        )}
                      </span>
                      {card.assignee && (
                        <span className="avatar" style={{ "--c": card.assignee.avatarColor } as React.CSSProperties}>
                          {initials(card.assignee.displayName)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {selectedCard && (
        <div className="modal-backdrop" onClick={() => setSelectedCardId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">
              {label} · {selectedCard.column}
            </p>
            <h2>{selectedCard.title}</h2>
            <p>{selectedCard.description}</p>
            <button type="button" onClick={() => setSelectedCardId(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Verify**

Open `http://localhost:3000/boards/tasks` in a browser. Confirm:
- "+ New card" creates a card titled "Untitled Task" in the "To Do" column.
- Dragging that card into "In Progress" moves it and persists after a page refresh.
- Clicking a card opens the placeholder detail view with its title/description; "Close" dismisses it.
- The assignee filter chips and search box narrow the visible cards; switching to `/boards/bugs` and `/boards/features` shows their own empty-state messages per column.

- [ ] **Step 4: Commit**

```bash
git add src/app/boards src/components/Board/BoardView.tsx
git commit -m "Add Board page with drag-and-drop, filters, and search"
```

---

### Task 11: Card detail modal + comment thread

**Files:**
- Create: `src/components/Board/CardModal.tsx`, `src/components/Board/CommentThread.tsx`
- Modify: `src/components/Board/BoardView.tsx`

**Interfaces:**
- Consumes: `PATCH /api/cards/:id`, `GET /api/cards/:id`, `POST /api/cards/:id/comments`, `DELETE /api/comments/:id` (Tasks 6–7), `Card` type from `BoardView.tsx` (Task 10).
- Produces: the full card detail modal (inline-editable title/description, immediate-save priority/assignee/due-date dropdowns, comment thread) replacing Task 10's placeholder.

- [ ] **Step 1: Write `src/components/Board/CommentThread.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

type Comment = {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarColor: string };
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function CommentThread({ cardId }: { cardId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/cards/${cardId}`)
      .then((r) => r.json())
      .then((card) => {
        setComments(card.comments);
        setLoading(false);
      });
  }, [cardId]);

  async function post() {
    if (!text.trim()) return;
    const res = await fetch(`/api/cards/${cardId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setComments((prev) => [...prev, await res.json()]);
    setText("");
  }

  async function remove(id: string) {
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p className="page-purpose">Loading comments…</p>;

  return (
    <div className="comment-thread">
      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <span className="avatar" style={{ "--c": c.author.avatarColor } as React.CSSProperties}>
            {initials(c.author.displayName)}
          </span>
          <div className="comment-body">
            <p className="comment-meta">
              {c.author.displayName} · {new Date(c.createdAt).toLocaleString()}
            </p>
            <p>{c.text}</p>
          </div>
          <button type="button" onClick={() => remove(c.id)} aria-label="Delete comment">
            ×
          </button>
        </div>
      ))}
      <textarea
        className="comment-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment…"
      />
      <button className="btn-primary" type="button" onClick={post}>
        Post
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/Board/CardModal.tsx`**

```tsx
"use client";

import { useState } from "react";
import CommentThread from "./CommentThread";
import type { Card } from "./BoardView";

type User = { id: string; username: string; displayName: string; avatarColor: string };

export default function CardModal({
  card,
  boardLabel,
  users,
  onClose,
  onUpdated,
}: {
  card: Card;
  boardLabel: string;
  users: User[];
  onClose: () => void;
  onUpdated: (card: Card) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");

  async function patch(fields: Record<string, unknown>) {
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    onUpdated(await res.json());
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <p className="eyebrow">
            {boardLabel} · {card.column}
          </p>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <input
          className="modal-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== card.title && patch({ title })}
        />

        <div className="modal-fields">
          <label>
            Priority
            <select value={card.priority ?? ""} onChange={(e) => patch({ priority: e.target.value || null })}>
              <option value="">None</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label>
            Assignee
            <select value={card.assignee?.id ?? ""} onChange={(e) => patch({ assigneeId: e.target.value || null })}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input
              type="date"
              value={card.dueDate ? card.dueDate.slice(0, 10) : ""}
              onChange={(e) => patch({ dueDate: e.target.value || null })}
            />
          </label>
        </div>

        <textarea
          className="modal-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (card.description ?? "") && patch({ description })}
          placeholder="Description"
        />

        <p className="modal-footer">
          Added by {card.createdBy.displayName} · {new Date(card.createdAt).toLocaleDateString()}
        </p>

        <CommentThread cardId={card.id} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Modify `src/components/Board/BoardView.tsx`**

Add the import near the top:

```tsx
import CardModal from "./CardModal";
```

Replace the placeholder modal block at the end of the component:

```tsx
      {selectedCard && (
        <div className="modal-backdrop" onClick={() => setSelectedCardId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">
              {label} · {selectedCard.column}
            </p>
            <h2>{selectedCard.title}</h2>
            <p>{selectedCard.description}</p>
            <button type="button" onClick={() => setSelectedCardId(null)}>
              Close
            </button>
          </div>
        </div>
      )}
```

with:

```tsx
      {selectedCard && (
        <CardModal
          card={selectedCard}
          boardLabel={label}
          users={users}
          onClose={() => setSelectedCardId(null)}
          onUpdated={(updated) =>
            setCards((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
          }
        />
      )}
```

- [ ] **Step 4: Verify**

Open `http://localhost:3000/boards/bugs` in a browser. Create a card, open it, and confirm:
- Editing the title and clicking away (blur) saves it — refresh the page to confirm persistence.
- Changing priority to High shows the "High" badge on the card face after closing the modal; Medium/Low show only the stripe color.
- Changing assignee updates the card face's avatar chip.
- Setting a due date shows the due badge on the card face.
- Posting a comment shows it in the thread immediately; deleting it removes it immediately.
- Editing the description and blurring saves it (refresh to confirm).

- [ ] **Step 5: Commit**

```bash
git add src/components/Board/CardModal.tsx src/components/Board/CommentThread.tsx src/components/Board/BoardView.tsx
git commit -m "Add card detail modal with inline editing and comments"
```

---

### Task 12: Home page UI + final end-to-end verification

**Files:**
- Create: `src/components/Home/HomeView.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `GET /api/home`, `POST /api/cards` (Tasks 6, 8), `BOARD_LABELS`/`BOARD_SLUGS` (Task 6).
- Produces: the working Home page — quick capture, my open cards, due soon, recently completed, quick links.

- [ ] **Step 1: Write `src/components/Home/HomeView.tsx`**

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BOARD_LABELS, BOARD_SLUGS, type BoardType } from "@/lib/boards";

type CardSummary = {
  id: string;
  boardType: BoardType;
  title: string;
  dueDate: string | null;
};
type LinkSummary = { id: string; title: string; url: string };
type HomeData = {
  myOpenCards: CardSummary[];
  dueSoon: CardSummary[];
  recentlyCompleted: CardSummary[];
  quickLinks: LinkSummary[];
};

export default function HomeView() {
  const [data, setData] = useState<HomeData | null>(null);
  const [title, setTitle] = useState("");
  const [captureType, setCaptureType] = useState<BoardType>("TASK");

  async function load() {
    const res = await fetch("/api/home");
    setData(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCapture(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardType: captureType, title }),
    });
    setTitle("");
    load();
  }

  if (!data) return <p className="page-purpose">Loading…</p>;

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Home</p>
          <h1>Morning, crew</h1>
        </div>
      </header>

      <div className="panel">
        <h2>Got something on your mind?</h2>
        <form onSubmit={handleCapture} className="quick-capture">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
          <select value={captureType} onChange={(e) => setCaptureType(e.target.value as BoardType)}>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature idea</option>
            <option value="TASK">Task</option>
          </select>
          <button className="btn-primary" type="submit">
            Add card
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>My open cards</h2>
        {data.myOpenCards.length === 0 && <p className="column-empty">Nothing assigned to you right now.</p>}
        <ul>
          {data.myOpenCards.map((card) => (
            <li className="list-item" key={card.id}>
              <Link href={`/boards/${BOARD_SLUGS[card.boardType]}`}>
                <span className="card-meta-left">{BOARD_LABELS[card.boardType]}</span> {card.title}
                {card.dueDate && <span className="card-due"> Due {new Date(card.dueDate).toLocaleDateString()}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Due soon</h2>
        {data.dueSoon.length === 0 && <p className="column-empty">Nothing has a due date yet.</p>}
        <ul>
          {data.dueSoon.map((card) => (
            <li className="list-item" key={card.id}>
              <Link href={`/boards/${BOARD_SLUGS[card.boardType]}`}>
                <span className="card-meta-left">{BOARD_LABELS[card.boardType]}</span> {card.title}{" "}
                <span className="card-due">Due {new Date(card.dueDate!).toLocaleDateString()}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Recently completed</h2>
        {data.recentlyCompleted.length === 0 && <p className="column-empty">Nothing completed yet.</p>}
        <ul>
          {data.recentlyCompleted.map((card) => (
            <li className="list-item" key={card.id}>
              <span className="card-meta-left">{BOARD_LABELS[card.boardType]}</span> {card.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Quick links</h2>
        {data.quickLinks.length === 0 && <p className="column-empty">No links yet.</p>}
        <ul>
          {data.quickLinks.map((link) => (
            <li className="list-item" key={link.id}>
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/page.tsx`**

```tsx
import HomeView from "@/components/Home/HomeView";

export default function HomePage() {
  return <HomeView />;
}
```

- [ ] **Step 3: Final end-to-end verification**

```bash
docker compose down
docker compose up -d --build
sleep 5
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run prisma:seed
```

Then in a browser, working through the full flow:
- Visit `http://localhost:3000` — redirected to `/login`. Log in as `jason` with your `SEED_PASSWORD` value.
- On Home, use quick capture to add one Bug, one Feature, and one Task — confirm each appears under "My open cards" only if you assign it to yourself (it won't be auto-assigned; open it and set the assignee to confirm the Home list updates on next load).
- Visit `/boards/bugs`, `/boards/features`, `/boards/tasks` — confirm each shows its own columns, drag a card between columns, open the modal, edit every field, add and delete a comment.
- Set a due date on a card — confirm it shows in Home's "Due soon".
- Drag a card into its board's terminal column (Released/Done) — confirm it appears in Home's "Recently completed" and drops out of "My open cards" if assigned to you.
- Visit `/resources` and `/usage` — confirm both show "In development".
- Click "Log out" — confirm you land back on `/login` and `/` redirects there when visited directly.

- [ ] **Step 4: Commit**

```bash
git add src/components/Home/HomeView.tsx src/app/page.tsx
git commit -m "Add Home page wired to real card and link data"
```

---

## Self-Review Notes

- **Spec coverage:** Auth (Task 5), Home (Tasks 8, 12), Boards + drag-and-drop + modal + comments (Tasks 6, 7, 9, 10, 11), Resources/Usage placeholders (Task 9), Docker (Task 2), seed accounts only (Task 4), no tests (all verification steps are manual commands/checklists), Environments cut (no task references it). All covered.
- **Type consistency checked:** `Card` type is defined once in `BoardView.tsx` and imported by `CardModal.tsx`; `BoardType`/`Priority` string unions match the Prisma enums exactly; `BOARD_SLUGS`/`slugToBoardType` are the single source of truth for URL↔enum mapping, used identically in the board page, Sidebar, and Home.
- **No placeholders:** every step has complete, runnable code or an exact command with expected output. Task 9's CSS step is a verbatim-copy instruction rather than reproducing 490 lines of existing CSS inline — the source is precisely line-addressed in the mockup file already in the repo.

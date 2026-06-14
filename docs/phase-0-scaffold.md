# Phase 0 — Scaffold & Safety Rails

Goal: a running Next.js skeleton with the guardrails (`authorize`, `withAudit`, money, AI interface) in place **before any feature**. Run these steps (or hand this file to Claude Code and say "execute Phase 0").

## Prerequisites
- **Node.js 20 LTS** (`node -v`) and a package manager (pnpm recommended).
- **Docker** (for local PostgreSQL + Redis) or local installs.
- **Git**.

## 1. Create the app
```bash
npx create-next-app@latest spims --typescript --app --tailwind --eslint --src-dir=false --import-alias "@/*"
cd spims
```

## 2. Install dependencies
```bash
pnpm add @prisma/client zod @tanstack/react-query next-intl framer-motion argon2 \
  bullmq ioredis @aws-sdk/client-s3 @aws-sdk/s3-request-presigner nodemailer \
  @google/generative-ai react-hook-form @hookform/resolvers lucide-react
pnpm add -D prisma vitest @playwright/test @types/nodemailer
npx shadcn@latest init        # choose your base color; adds components/ui
npx shadcn@latest add button input select dialog sheet tabs card badge sonner tooltip dropdown-menu table skeleton avatar
```

## 3. Database + Redis (dev)
`docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment: { POSTGRES_PASSWORD: dev, POSTGRES_DB: spims }
    ports: ["5432:5432"]
    volumes: [pg:/var/lib/postgresql/data]
  redis:
    image: redis:7
    ports: ["6379:6379"]
volumes: { pg: {} }
```
```bash
docker compose up -d
npx prisma init
# replace prisma/schema.prisma with docs/schema.prisma, then:
npx prisma migrate dev --name init
```

## 4. Folder structure
```bash
mkdir -p lib/auth lib/audit lib/services lib/validation lib/payments lib/zoom lib/ai lib/storage lib/email lib/i18n messages tests
```

## 5. `.env` (copy `.env.example` → `.env`)
```
DATABASE_URL="postgresql://postgres:dev@localhost:5432/spims"
REDIS_URL="redis://localhost:6379"
SESSION_SECRET="change-me"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_API_KEY=          # optional — AI degrades gracefully if empty
STORAGE_ENDPOINT=        # R2 or S3 endpoint
STORAGE_BUCKET=
STORAGE_KEY=
STORAGE_SECRET=
EMAIL_HOST=  EMAIL_PORT=  EMAIL_USER=  EMAIL_PASS=  EMAIL_FROM=
```

---

## 6. Guardrail skeletons (the heart of Phase 0)

**`lib/db.ts`** — Prisma singleton
```ts
import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
```

**`lib/money.ts`** — integer minor units, no floats, no conversion
```ts
export type Currency = "EGP" | "USD";
export interface Money { amountMinor: number; currency: Currency; }

export const money = (amountMinor: number, currency: Currency): Money =>
  ({ amountMinor: Math.round(amountMinor), currency });

function sameCurrency(a: Money, b: Money) {
  if (a.currency !== b.currency)
    throw new Error("Refusing to mix currencies — no conversion is allowed.");
}
export const add = (a: Money, b: Money): Money => (sameCurrency(a, b), money(a.amountMinor + b.amountMinor, a.currency));
export const sub = (a: Money, b: Money): Money => (sameCurrency(a, b), money(a.amountMinor - b.amountMinor, a.currency));
export const format = (m: Money) =>
  new Intl.NumberFormat(m.currency === "EGP" ? "ar-EG" : "en-US",
    { style: "currency", currency: m.currency }).format(m.amountMinor / 100);
```

**`lib/errors.ts`** — typed errors, consistent shape
```ts
export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
export const Unauthorized = () => new AppError("UNAUTHORIZED", "Not signed in", 401);
export const Forbidden = () => new AppError("FORBIDDEN", "Not allowed", 403);
export const NotFound = (what = "Resource") => new AppError("NOT_FOUND", `${what} not found`, 404);

export function toResponse(err: unknown) {
  if (err instanceof AppError) return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  console.error(err);
  return Response.json({ error: { code: "INTERNAL", message: "Something went wrong" } }, { status: 500 });
}
```

**`lib/auth/permissions.ts`** — the matrix as code (excerpt; expand from `permissions-matrix.md`)
```ts
import type { RoleType } from "@prisma/client";

export type Action =
  | "user.manage" | "role.assign.admin" | "course.pricing.edit"
  | "session.schedule" | "grade.lock" | "grade.reopen"
  | "application.decide" | "payment.manual" | "theme.edit";

type Rule = { roles: RoleType[]; scope?: (userId: string, resource: any) => boolean };

export const PERMISSIONS: Record<Action, Rule> = {
  "user.manage":        { roles: ["SUPER_ADMIN", "ADMINISTRATIVE_ADMIN"] },
  "role.assign.admin":  { roles: ["SUPER_ADMIN"] }, // SA only for admin roles
  "course.pricing.edit":{ roles: ["SUPER_ADMIN", "FINANCIAL_ADMIN"] },
  "session.schedule":   { roles: ["SUPER_ADMIN", "ADMINISTRATIVE_ADMIN"] },
  "grade.lock":         { roles: ["SUPER_ADMIN", "INSTRUCTOR"], scope: isOfferingStaff },
  "grade.reopen":       { roles: ["SUPER_ADMIN", "ACADEMIC_ADMIN"] },
  "application.decide": { roles: ["SUPER_ADMIN", "ADMINISTRATIVE_ADMIN"], scope: isAssignedReviewer },
  "payment.manual":     { roles: ["SUPER_ADMIN", "FINANCIAL_ADMIN"] },
  "theme.edit":         { roles: ["SUPER_ADMIN", "ADMINISTRATIVE_ADMIN"] },
};

// scope predicates (implement against Prisma in services)
function isOfferingStaff(userId: string, r: { offeringId: string }) { return true; /* TODO */ }
function isAssignedReviewer(userId: string, r: { reviewerId?: string }) { return r.reviewerId === userId; }
```

**`lib/auth/authorize.ts`** — the single guard (role + scope)
```ts
import { PERMISSIONS, Action } from "./permissions";
import { Forbidden, Unauthorized } from "../errors";
import type { RoleType } from "@prisma/client";

export interface SessionUser { id: string; roles: RoleType[]; }

export function authorize(user: SessionUser | null, action: Action, resource?: any) {
  if (!user) throw Unauthorized();
  const rule = PERMISSIONS[action];
  const roleOk = user.roles.includes("SUPER_ADMIN") || user.roles.some(r => rule.roles.includes(r));
  if (!roleOk) throw Forbidden();
  if (rule.scope && !rule.scope(user.id, resource)) throw Forbidden();
  return true;
}
```

**`lib/audit/withAudit.ts`** — every mutation logged, in a transaction
```ts
import { prisma } from "../db";

export async function withAudit<T>(
  ctx: { actorId?: string; actorRole?: string; ip?: string; userAgent?: string; requestId?: string },
  action: string,
  entity: { type?: string; id?: string },
  fn: (tx: typeof prisma) => Promise<{ result: T; before?: unknown; after?: unknown }>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const { result, before, after } = await fn(tx as typeof prisma);
    await tx.auditLog.create({ data: {
      actorId: ctx.actorId, actorRole: ctx.actorRole, action,
      entityType: entity.type, entityId: entity.id,
      before: before as any, after: after as any,
      ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId,
    }});
    return result;
  });
}
```

**`lib/ai/index.ts`** — swappable provider; **no key = no crash**
```ts
export interface AIProvider {
  translate(text: string, target: string): Promise<string | null>;
  gradeEssay(answer: string, keyPoints: string, guidance: string): Promise<{ score: number; rationale: string } | null>;
}

const noop: AIProvider = { async translate() { return null; }, async gradeEssay() { return null; } };

function gemini(): AIProvider {
  // import { GoogleGenerativeAI } from "@google/generative-ai"; wire up here
  return {
    async translate(text, target) { /* call Gemini */ return null; },
    async gradeEssay(answer, keyPoints, guidance) { /* call Gemini */ return null; },
  };
}

export const ai: AIProvider = process.env.GOOGLE_API_KEY ? gemini() : noop;
```

**`lib/auth/session.ts`** — current user from cookie (skeleton)
```ts
import { cookies } from "next/headers";
import { prisma } from "../db";
import type { SessionUser } from "./authorize";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { token }, include: { user: { include: { roles: true } } } });
  if (!s || s.expiresAt < new Date()) return null;
  return { id: s.user.id, roles: s.user.roles.map(r => r.role) };
}
```

**Example route using all of it** — `app/api/themes/[id]/activate/route.ts`
```ts
import { getCurrentUser } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { withAudit } from "@/lib/audit/withAudit";
import { toResponse } from "@/lib/errors";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    authorize(user, "theme.edit");
    await withAudit({ actorId: user!.id }, "theme.activate", { type: "Theme", id }, async (tx) => {
      await tx.theme.updateMany({ data: { isActive: false } });
      const after = await tx.theme.update({ where: { id }, data: { isActive: true } });
      return { result: after, after };
    });
    return Response.json({ ok: true });
  } catch (e) { return toResponse(e); }
}
```

## ✅ Phase 0 acceptance
- App boots (`pnpm dev`); locale switch works incl. RTL on Arabic.
- The example route returns **403** for a non-admin and **200** for an admin.
- Activating a theme writes an `AuditLog` row.
- `pnpm test` (a unit test for `authorize` + `money`) passes; lint + typecheck clean.

Once green → proceed to **Phase 1** in `claude-code-build-brief.md`.

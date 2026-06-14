# Spims — SIS + LMS

A Student Information System + Learning Management System for **Spims**, a Coptic Orthodox online school (Christian Orthodox sciences & history). One web app, fully mobile-responsive, trilingual (Arabic / English / French, extensible), inspired by Populi.

This repository starts as a **complete design package** that an AI coding agent (Claude Code or Cursor) builds out phase by phase. Read the documents in the order below.

## 📚 Documents (read in this order)
1. **`docs/spims-spec-v0.2.md`** — the product specification. The source of truth for *what* the system does.
2. **`docs/schema.prisma`** — the database (~50 models across 9 contexts).
3. **`docs/permissions-matrix.md`** — the 7 roles × 14 contexts authorization contract.
4. **`docs/api-route-structure.md`** — ~90 API endpoints + backend architecture.
5. **`docs/frontend-architecture.md`** — routes per role, components, RTL/i18n, theming, motion.
6. **`docs/claude-code-build-brief.md`** — **the build plan**: Phase 0–9 with guardrails & acceptance criteria.
7. **`docs/getting-started.md`** — how to drive Claude Code/Cursor through the build, and how to set up the VPS + domain.
8. **`docs/phase-0-scaffold.md`** — the exact commands + starter code for the foundation.

## 🧱 Stack
Next.js (App Router) + TypeScript · PostgreSQL + Prisma · Tailwind + shadcn/ui · Framer Motion · next-intl · TanStack Query · react-hook-form + Zod · BullMQ + Redis. Self-hosted on a VPS.

## ✅ Key decisions (locked)
- **Roles (7):** Super Admin, Administrative Admin, Academic Admin, Financial Admin, Instructor, TA, Student.
- **Languages:** Arabic (RTL) / English / French, extensible; UI labels curated, instructor content AI-translated + human-verified.
- **Pricing:** independent **USD & EGP** prices, **no conversion**; region decides which applies. Owned by Financial Admin.
- **Wallet:** EGP money, USD money, EGP points, USD points (points = 1 EGP, spend-only); refunds in original currency; split payments; donations.
- **Gateways:** PayPal (USD) · Paymob + Cashier (EGP). **Storage:** S3-compatible — Cloudflare R2 or AWS S3 (same code).
- **AI:** Google **Gemini** via a swappable `lib/ai` interface — **a missing key never blocks build/run** (`GOOGLE_API_KEY`).
- **Live sessions:** Zoom, **1 host in v1** → license-aware central scheduler (Administrative Admin). **Video:** Vimeo.
- **Hosting:** self-hosted VPS (Hetzner recommended), ≤ ~$300/yr; daily off-site DB backups.

## 🏗️ Non-negotiable guardrails (enforced in every phase)
1. Never bypass `authorize(user, action, resource)` (role + scope).
2. Every mutation runs through a service wrapped by `withAudit()` → writes to `AuditLog`.
3. Money is integer **minor units** + currency, always. No floats. No currency conversion.
4. Validate every input with Zod. i18n + RTL from day one. Server-authoritative exam timer. Idempotent webhooks.

## 🚀 Start here
See **`docs/getting-started.md`** → run **`docs/phase-0-scaffold.md`**, then feed the agent the build brief one phase at a time.

## 📁 Planned project structure
```
app/[locale]/        routes: (public) (auth) (app)
components/          ui + domain components
lib/                 db, auth (authorize), audit, services, validation, money, payments, zoom, ai, storage, email, i18n
prisma/schema.prisma
messages/{ar,en,fr}.json
tests/               vitest (unit) + playwright (e2e)
docs/                the 8 documents above
```

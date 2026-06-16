# Release runbook

## Pre-release

1. Merge to `main`; confirm CI green (lint, typecheck, unit tests, migrations).
2. Run local acceptance: `npx tsx scripts/acceptance-phase9.ts`
3. Tag release: `git tag v0.x.y && git push origin v0.x.y`

## Deploy

```bash
ssh deploy@your-vps
cd /opt/spims
git pull origin main
docker compose -f docker-compose.prod.yml build app worker
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d app worker
```

Migrations run via the one-shot `migrate` service (includes seed upserts — idempotent).

## Post-deploy smoke

```bash
curl -sf https://your.domain/api/health
npx tsx scripts/acceptance-phase9.ts
npm run test:e2e -- tests/e2e/phase9.spec.ts
```

Login as seed Super Admin and verify dashboard loads.

## Rollback

1. `git checkout <previous-tag>`
2. Rebuild and restart app + worker
3. If schema regressed, restore DB from latest backup:

```bash
./scripts/restore-db.sh /var/backups/spims/<latest>.sql.gz
docker compose -f docker-compose.prod.yml up -d app worker
```

## Concurrency validation (major releases)

Re-run on production hardware:

```bash
npx tsx scripts/load-test-exam.ts <attemptId> 150
```

Document results in the release notes.

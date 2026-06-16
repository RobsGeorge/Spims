# Hetzner VPS deployment runbook

Target: Ubuntu 24.04 LTS on Hetzner Cloud (CX22 or larger recommended).

## 1. Server bootstrap

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx postgresql-client
sudo usermod -aG docker $USER
```

Clone the repo to `/opt/spims` and copy `.env` from `.env.example` with production secrets.

Required production env vars:

- `DATABASE_URL` — use the compose Postgres service or managed DB
- `REDIS_URL=redis://redis:6379` (inside compose network)
- `SESSION_SECRET` — long random string
- `NEXT_PUBLIC_APP_URL=https://your.domain`
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — initial Super Admin credentials
- Payment, storage, email, Zoom keys as needed

## 2. Deploy with Docker Compose

```bash
cd /opt/spims
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Services:

| Service | Role |
|---------|------|
| `postgres` | PostgreSQL 16 |
| `redis` | Redis 7 (BullMQ) |
| `migrate` | `prisma migrate deploy` + seed (one-shot) |
| `app` | Next.js (port 3000 on localhost) |
| `worker` | BullMQ job processor |

Verify:

```bash
curl -s http://127.0.0.1:3000/api/health | jq
docker compose -f docker-compose.prod.yml logs worker --tail=20
```

## 3. Nginx + TLS (Let's Encrypt)

```bash
sudo cp deploy/nginx/spims.conf /etc/nginx/sites-available/spims
# Edit server_name and certificate paths
sudo ln -s /etc/nginx/sites-available/spims /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your.domain
```

Confirm HTTPS: `curl -I https://your.domain/api/health`

## 4. Daily off-site backups

```bash
sudo mkdir -p /var/backups/spims /offsite/spims   # off-site mount or rclone target
chmod +x scripts/backup-db.sh
```

Cron (daily 02:30 UTC):

```cron
30 2 * * * cd /opt/spims && BACKUP_DIR=/var/backups/spims BACKUP_OFFSITE_PATH=/offsite/spims DATABASE_URL='...' ./scripts/backup-db.sh >> /var/log/spims-backup.log 2>&1
```

### Restore drill (monthly)

```bash
./scripts/restore-db.sh /var/backups/spims/spims-YYYY-MM-DDTHH-MM-SS.sql.gz
npx tsx scripts/verify-backup-restore.ts
```

## 5. Log rotation

```bash
sudo cp deploy/logrotate/spims /etc/logrotate.d/spims
```

## 6. Monitoring

- Uptime: external ping to `https://your.domain/api/health` (expect `status: ok` or `degraded`)
- Disk: alert if `/var/backups` > 80%
- Worker: `docker compose -f docker-compose.prod.yml ps worker` must be `running`

## 7. Exam concurrency on production

After seeding a test attempt:

```bash
npx tsx scripts/load-test-exam.ts <attemptId> 150
```

Target: ≥95% acceptable responses, avg latency acceptable on your VPS tier.

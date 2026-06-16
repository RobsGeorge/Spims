#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"

mkdir -p "$BACKUP_DIR"
FILENAME="spims-$(date -u +%Y-%m-%dT%H-%M-%S).sql.gz"
OUTFILE="$BACKUP_DIR/$FILENAME"

echo "Backing up database to $OUTFILE"
pg_dump "$DATABASE_URL" | gzip > "$OUTFILE"
echo "Backup complete ($(du -h "$OUTFILE" | awk '{print $1}'))"

if [ -n "${BACKUP_OFFSITE_PATH:-}" ]; then
  cp "$OUTFILE" "$BACKUP_OFFSITE_PATH/"
  echo "Copied to off-site path: $BACKUP_OFFSITE_PATH"
fi

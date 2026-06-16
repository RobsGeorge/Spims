#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Restoring from $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
echo "Restore complete"

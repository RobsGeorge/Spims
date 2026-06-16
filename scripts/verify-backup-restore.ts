/**
 * Verifies backup tooling: creates a gzipped dump when pg_dump is available.
 */
import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { backupFilename, isValidBackupFilename } from "../lib/backup/index";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP_DIR = process.env["BACKUP_DIR"] ?? join(ROOT, "backups");

function loadEnvFile() {
  const envPath = join(ROOT, ".env");
  try {
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env optional when DATABASE_URL is exported
  }
}

loadEnvFile();
const DATABASE_URL = process.env["DATABASE_URL"];

function hasPgDump(): boolean {
  const result = spawnSync("pg_dump", ["--version"], { encoding: "utf8" });
  return result.status === 0;
}

async function main() {
  console.log("=== Backup / Restore Verification ===\n");

  const name = backupFilename();
  if (!isValidBackupFilename(name)) {
    console.error("✗ Invalid backup filename format");
    process.exitCode = 1;
    return;
  }
  console.log(`✓ Backup filename format: ${name}`);

  if (!DATABASE_URL) {
    console.log("⚠ DATABASE_URL not set — skipping live pg_dump test");
    return;
  }

  if (!hasPgDump()) {
    console.log("⚠ pg_dump not found on PATH — skip live dump (install postgresql-client on VPS)");
    return;
  }

  mkdirSync(BACKUP_DIR, { recursive: true });
  const outfile = join(BACKUP_DIR, name);

  try {
    execSync(`pg_dump "${DATABASE_URL}" | gzip > "${outfile}"`, {
      stdio: "inherit",
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
    });
    const size = statSync(outfile).size;
    console.log(`✓ pg_dump created backup (${size} bytes)`);
    if (size < 100) {
      console.error("✗ Backup suspiciously small");
      process.exitCode = 1;
    }
  } finally {
    try {
      unlinkSync(outfile);
      console.log("✓ Cleaned up test backup file");
    } catch {
      // ignore
    }
  }

  console.log("\nRestore: scripts/restore-db.sh <backup-file.sql.gz>");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

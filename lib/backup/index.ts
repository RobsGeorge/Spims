export function backupFilename(date = new Date()): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `spims-${stamp}.sql.gz`;
}

export function isValidBackupFilename(name: string): boolean {
  return /^spims-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.sql\.gz$/.test(name);
}

export function parseDatabaseUrl(url: string): {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
} | null {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || "5432",
      database: parsed.pathname.replace(/^\//, ""),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  } catch {
    return null;
  }
}

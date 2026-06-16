import { describe, it, expect } from "vitest";
import {
  backupFilename,
  isValidBackupFilename,
  parseDatabaseUrl,
} from "@/lib/backup/index";

describe("backup helpers", () => {
  it("generates timestamped backup filenames", () => {
    const name = backupFilename(new Date("2026-06-14T12:30:45.000Z"));
    expect(name).toBe("spims-2026-06-14T12-30-45.sql.gz");
    expect(isValidBackupFilename(name)).toBe(true);
  });

  it("rejects invalid backup filenames", () => {
    expect(isValidBackupFilename("backup.sql")).toBe(false);
  });

  it("parses postgres URLs", () => {
    const parsed = parseDatabaseUrl("postgresql://spims:secret@db:5432/spims");
    expect(parsed).toEqual({
      host: "db",
      port: "5432",
      database: "spims",
      user: "spims",
      password: "secret",
    });
  });
});

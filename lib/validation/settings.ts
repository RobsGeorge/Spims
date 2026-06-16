import { z } from "zod";

export const KNOWN_SETTINGS = ["zoom.concurrent_hosts"] as const;
export type SettingKey = (typeof KNOWN_SETTINGS)[number];

export const updateSettingSchema = z.object({
  value: z.unknown(),
});

export function validateSettingValue(key: SettingKey, value: unknown): unknown {
  if (key === "zoom.concurrent_hosts") {
    const n = z.number().int().positive().max(10).parse(value);
    return n;
  }
  throw new Error(`Unknown setting key: ${key}`);
}

type JsonObject = Record<string, unknown>;

/** Flatten nested message JSON to dot-separated keys. */
export function flattenMessageKeys(obj: JsonObject, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenMessageKeys(value as JsonObject, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

export function compareCatalogs(
  base: JsonObject,
  other: JsonObject,
): { missing: string[]; extra: string[] } {
  const baseKeys = new Set(flattenMessageKeys(base));
  const otherKeys = new Set(flattenMessageKeys(other));
  const missing = [...baseKeys].filter((k) => !otherKeys.has(k));
  const extra = [...otherKeys].filter((k) => !baseKeys.has(k));
  return { missing, extra };
}

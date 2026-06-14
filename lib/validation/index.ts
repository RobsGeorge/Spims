import { z, ZodSchema } from "zod";
import { AppError } from "@/lib/errors";

/** Parse and validate a JSON request body against a Zod schema. */
export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw AppError.badRequest("Request body must be valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw AppError.validation("Validation failed", result.error.flatten());
  }
  return result.data;
}

/** Parse and validate URL search params against a Zod schema. */
export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>,
): T {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw AppError.validation("Invalid query parameters", result.error.flatten());
  }
  return result.data;
}

// Re-export zod so callers can import from one place
export { z };

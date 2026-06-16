import { z, type ZodTypeAny } from "zod";
import { AppError } from "@/lib/errors";

/** Parse and validate a JSON request body against a Zod schema. */
export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
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
export function parseQuery<S extends ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: S,
): z.output<S> {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw AppError.validation("Invalid query parameters", result.error.flatten());
  }
  return result.data;
}

// Re-export zod so callers can import from one place
export { z };

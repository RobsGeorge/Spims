import { describe, it, expect } from "vitest";
import { AppError, normalizeError } from "@/lib/errors";
import { ZodError, z } from "zod";

describe("AppError", () => {
  it("creates an unauthorized error with status 401", () => {
    const err = AppError.unauthorized();
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.statusCode).toBe(401);
  });

  it("creates a forbidden error with status 403", () => {
    const err = AppError.forbidden("nope");
    expect(err.code).toBe("FORBIDDEN");
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("nope");
  });

  it("creates a not-found error with status 404", () => {
    const err = AppError.notFound("missing");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.statusCode).toBe(404);
  });

  it("creates a validation error with status 422 and details", () => {
    const err = AppError.validation("bad input", { field: "name" });
    expect(err.code).toBe("VALIDATION");
    expect(err.statusCode).toBe(422);
    expect(err.details).toEqual({ field: "name" });
  });

  it("creates a conflict error with status 409", () => {
    const err = AppError.conflict("already exists");
    expect(err.code).toBe("CONFLICT");
    expect(err.statusCode).toBe(409);
  });
});

describe("normalizeError", () => {
  it("normalizes AppError", () => {
    const err = AppError.forbidden("denied");
    const { body, status } = normalizeError(err);
    expect(status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
    expect(body.message).toBe("denied");
  });

  it("normalizes ZodError to 422", () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 42 });
    expect(result.success).toBe(false);
    const zodErr = (result as { error: ZodError }).error;
    const { body, status } = normalizeError(zodErr);
    expect(status).toBe(422);
    expect(body.code).toBe("VALIDATION");
    expect(body.details).toBeDefined();
  });

  it("normalizes unknown errors to 500", () => {
    const { body, status } = normalizeError(new Error("boom"));
    expect(status).toBe(500);
    expect(body.code).toBe("INTERNAL");
  });
});

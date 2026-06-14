import { ZodError } from "zod";
import { NextResponse } from "next/server";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError("UNAUTHORIZED", message, 401);
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError("FORBIDDEN", message, 403);
  }

  static notFound(message = "Not found"): AppError {
    return new AppError("NOT_FOUND", message, 404);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError("VALIDATION", message, 422, details);
  }

  static conflict(message: string): AppError {
    return new AppError("CONFLICT", message, 409);
  }

  static badRequest(message: string): AppError {
    return new AppError("BAD_REQUEST", message, 400);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError("INTERNAL", message, 500);
  }
}

export interface NormalizedError {
  code: ErrorCode | "INTERNAL";
  message: string;
  details?: unknown;
}

export function normalizeError(err: unknown): { body: NormalizedError; status: number } {
  if (err instanceof AppError) {
    return {
      body: { code: err.code, message: err.message, details: err.details },
      status: err.statusCode,
    };
  }

  if (err instanceof ZodError) {
    return {
      body: {
        code: "VALIDATION",
        message: "Validation failed",
        details: err.flatten(),
      },
      status: 422,
    };
  }

  console.error("[unhandled error]", err);
  return {
    body: { code: "INTERNAL", message: "Internal server error" },
    status: 500,
  };
}

export function errorResponse(err: unknown): NextResponse {
  const { body, status } = normalizeError(err);
  return NextResponse.json(body, { status });
}

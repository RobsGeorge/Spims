import { RoleType } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { type Action, isActionAllowed } from "./permissions";
import type { SessionUser } from "./session";

export type { Action };

/**
 * Authorize a user to perform an action on an optional resource.
 *
 * - Super Admin: always allowed.
 * - Otherwise: checks the permission map for the union of the user's roles.
 * - If scopeCheck is provided, it must also return true (for own-scoped / offering-staff checks).
 *
 * Throws AppError.forbidden() on denial.
 * Throws AppError.unauthorized() if user is null.
 */
export function authorize(
  user: SessionUser | null,
  action: Action,
  opts?: {
    /** Additional scope predicate — must return true for access to be granted. */
    scopeCheck?: () => boolean | Promise<boolean>;
    /** Override the error message. */
    message?: string;
  },
): void | Promise<void> {
  if (!user) {
    throw AppError.unauthorized();
  }

  // SA bypasses everything
  if (user.roles.includes(RoleType.SUPER_ADMIN)) {
    return;
  }

  if (!isActionAllowed(user.roles, action)) {
    throw AppError.forbidden(opts?.message ?? `Action "${action}" is not permitted`);
  }

  // Scope predicate (may be async)
  if (opts?.scopeCheck) {
    const check = opts.scopeCheck();
    if (check instanceof Promise) {
      return check.then((ok) => {
        if (!ok) throw AppError.forbidden(opts.message ?? "Scope check failed");
      });
    }
    if (!check) {
      throw AppError.forbidden(opts.message ?? "Scope check failed");
    }
  }
}

/** Convenience: check without throwing — returns boolean. */
export function can(user: SessionUser | null, action: Action): boolean {
  if (!user) return false;
  if (user.roles.includes(RoleType.SUPER_ADMIN)) return true;
  return isActionAllowed(user.roles, action);
}

/** Assert that the user holds at least one of the given roles. */
export function requireRole(user: SessionUser, ...roles: RoleType[]): void {
  if (user.roles.includes(RoleType.SUPER_ADMIN)) return;
  if (!roles.some((r) => user.roles.includes(r))) {
    throw AppError.forbidden(`Requires one of: ${roles.join(", ")}`);
  }
}

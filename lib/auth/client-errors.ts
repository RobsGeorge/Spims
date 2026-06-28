type ApiErrorBody = {
  code?: string;
  message?: string;
};

const MESSAGE_KEYS: Record<string, string> = {
  "Invalid email or password": "auth.invalidCredentials",
  "Email already registered": "auth.emailAlreadyRegistered",
  "Account suspended": "auth.accountSuspended",
  "Email not verified": "auth.emailNotVerified",
  "Invalid or expired verification code": "auth.invalidOtp",
  "Invalid or expired code": "auth.invalidOtp",
  "Email must be verified before setting a password": "auth.emailNotVerified",
};

const ALERT_KEYS: Record<string, string> = {
  "Invalid email or password": "auth.invalidCredentialsAlert",
  "Email already registered": "auth.emailAlreadyRegisteredAlert",
  "Account suspended": "auth.accountSuspendedAlert",
  "Email not verified": "auth.emailNotVerifiedAlert",
  "Invalid or expired verification code": "auth.invalidOtpAlert",
  "Invalid or expired code": "auth.invalidOtpAlert",
};

/** Map API auth errors to localized UI copy. */
export function getAuthErrorMessage(
  t: (key: string) => string,
  err: ApiErrorBody,
  mode: "field" | "alert" = "field",
): string {
  const map = mode === "alert" ? ALERT_KEYS : MESSAGE_KEYS;

  if (err.message) {
    const key = map[err.message] ?? MESSAGE_KEYS[err.message];
    if (key) return t(key);
  }
  if (err.code === "CONFLICT") {
    return t(mode === "alert" ? "auth.emailAlreadyRegisteredAlert" : "auth.emailAlreadyRegistered");
  }
  if (err.code === "FORBIDDEN" && err.message?.includes("suspended")) {
    return t(mode === "alert" ? "auth.accountSuspendedAlert" : "auth.accountSuspended");
  }
  return t("common.error");
}

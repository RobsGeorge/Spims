import { routing, type Locale } from "@/i18n/routing";

export { type Locale };

export function isValidLocale(locale: string): locale is Locale {
  return (routing.locales as readonly string[]).includes(locale);
}

export function rtlLocales(): Locale[] {
  return ["ar"];
}

export function isRtl(locale: Locale): boolean {
  return rtlLocales().includes(locale);
}

export function getDir(locale: Locale): "ltr" | "rtl" {
  return isRtl(locale) ? "rtl" : "ltr";
}

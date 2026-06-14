import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  void params; // locale is set by the [locale] segment
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center gap-4 absolute top-4 end-4">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      <h1 className="text-4xl font-bold text-primary text-center">
        {t("landing.headline")}
      </h1>
      <p className="text-muted-foreground text-center text-lg">
        {t("landing.subtitle")}
      </p>

      <div className="flex gap-4 mt-4">
        <Link
          href="/login"
          className="rounded-md bg-primary text-primary-foreground px-6 py-2 font-medium hover:opacity-90 transition-opacity"
        >
          {t("auth.login")}
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-primary text-primary px-6 py-2 font-medium hover:bg-primary/10 transition-colors"
        >
          {t("auth.register")}
        </Link>
      </div>
    </div>
  );
}

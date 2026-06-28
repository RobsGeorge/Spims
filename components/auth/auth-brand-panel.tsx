import { getTranslations } from "next-intl/server";
import { Landmark, GraduationCap, School, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AuthBrandVariant = "signIn" | "signUp" | "otp" | "setPassword" | "reset";

const dotPattern = {
  backgroundImage:
    "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 90% 80%, rgba(255,255,255,0.15) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
};

export async function AuthBrandPanel({ variant }: { variant: AuthBrandVariant }) {
  const t = await getTranslations();

  if (variant === "signIn") {
    return (
      <aside
        className="relative hidden w-full flex-col justify-between overflow-hidden bg-primary-deep p-8 text-primary-foreground md:flex md:w-5/12 xl:p-12"
        aria-hidden="false"
      >
        <div className="pointer-events-none absolute inset-0 opacity-100" style={dotPattern} />
        <Landmark
          className="pointer-events-none absolute -bottom-20 -start-20 h-[300px] w-[300px] opacity-[0.05]"
          strokeWidth={0.75}
          aria-hidden="true"
        />
        <div className="relative z-10">
          <h2 className="font-display text-4xl font-bold tracking-tight">{t("common.appName")}</h2>
          <p className="mt-2 text-xl font-normal text-primary-foreground/80">
            {t("auth.brandSubtitleSignIn")}
          </p>
        </div>
        <div className="relative z-10 mt-auto max-w-sm">
          <p className="font-display text-2xl font-semibold leading-tight text-balance xl:text-3xl">
            {t("auth.brandHeadlineSignIn")}
          </p>
          <div className="mt-4 h-1 w-16 rounded-full bg-gold" aria-hidden="true" />
        </div>
      </aside>
    );
  }

  if (variant === "signUp") {
    return (
      <aside
        className="relative hidden w-full flex-col justify-between overflow-hidden p-8 text-white md:flex md:w-5/12 xl:p-12"
        style={{ backgroundColor: "#7B1E3B" }}
        aria-hidden="false"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10">
          <h2 className="text-2xl font-semibold">{t("common.appName")}</h2>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
          <div className="mb-8 flex h-48 w-48 items-center justify-center rounded-full border-4 border-white/20 bg-white/10">
            <Building2 className="h-20 w-20 text-white/90" strokeWidth={1.25} aria-hidden="true" />
          </div>
          <p className="font-display text-3xl font-bold leading-tight text-balance xl:text-4xl">
            {t("auth.brandHeadlineSignUp")}
          </p>
          <p className="mt-3 text-lg text-white/80">{t("auth.brandSubtitleSignUp")}</p>
        </div>
        <p className="relative z-10 text-xs text-white/60">{t("auth.copyright")}</p>
      </aside>
    );
  }

  if (variant === "otp") {
    return (
      <aside
        className={cn(
          "relative hidden w-full flex-col justify-center overflow-hidden border-e border-border/30 p-8 md:flex md:w-5/12 xl:p-12",
          "bg-accent text-accent-foreground",
        )}
        aria-hidden="false"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235d0326' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 flex flex-col items-start gap-6">
          <div className="inline-flex items-center justify-center rounded-xl bg-card p-4 shadow-soft">
            <School className="h-12 w-12 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-4xl font-bold text-primary">{t("common.appName")}</h2>
            <p className="mt-2 text-xl text-primary">{t("auth.brandSubtitleOtp")}</p>
          </div>
        </div>
      </aside>
    );
  }

  if (variant === "setPassword") {
    return (
      <aside
        className="relative hidden w-full flex-col justify-between overflow-hidden bg-primary-deep p-8 text-primary-foreground md:flex md:w-5/12 xl:p-12"
        aria-hidden="false"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(45deg, rgba(212,175,55,0.04) 25%, transparent 25%, transparent 75%, rgba(212,175,55,0.04) 75%), linear-gradient(45deg, rgba(212,175,55,0.04) 25%, transparent 25%, transparent 75%, rgba(212,175,55,0.04) 75%)",
            backgroundSize: "60px 60px",
            backgroundPosition: "0 0, 30px 30px",
          }}
        />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("auth.brandTitleAcademic")}</h2>
          <p className="mt-3 max-w-md text-lg text-primary-foreground/80">
            {t("auth.brandDescriptionSetPassword")}
          </p>
        </div>
        <div className="relative z-10 mt-auto">
          <div className="mb-4 h-1 w-16 rounded-full bg-gold" aria-hidden="true" />
          <p className="text-primary-foreground/70 italic">{t("auth.brandQuote")}</p>
        </div>
      </aside>
    );
  }

  // reset
  return (
    <aside
      className="relative hidden w-full flex-col justify-end overflow-hidden bg-surface-variant p-8 text-primary-foreground md:flex md:w-5/12 xl:p-12"
      aria-hidden="false"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-deep/90 via-primary/80 to-primary-deep/95" />
      <div className="relative z-10">
        <GraduationCap className="mb-6 h-12 w-12 text-primary-foreground/80" aria-hidden="true" />
        <h2 className="font-display text-4xl font-bold">{t("common.appName")}</h2>
        <p className="mt-3 text-xl opacity-90">{t("auth.brandSubtitleReset")}</p>
      </div>
    </aside>
  );
}

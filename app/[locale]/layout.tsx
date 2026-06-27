import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter, Playfair_Display, IBM_Plex_Sans_Arabic } from "next/font/google";
import { routing, type Locale } from "@/i18n/routing";
import { getDir } from "@/lib/i18n";
import { Providers } from "@/components/providers";
import type { Metadata } from "next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Serif display voice (Latin headings) — see DESIGN.md "Serif-For-Voice Rule".
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

// Arabic carries all type (incl. headings) — see DESIGN.md "Arabic-Is-Sans Rule".
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "Spims",
  description: "Student Information & Learning Management System",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();
  const dir = getDir(locale as Locale);
  // Latin locales load Inter + Playfair; Arabic loads IBM Plex Sans Arabic.
  const fontClass =
    locale === "ar"
      ? `${plexArabic.variable} ${inter.variable}`
      : `${inter.variable} ${playfair.variable}`;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={fontClass}>
      <body className={locale === "ar" ? "font-arabic" : "font-sans"}>
        <NextIntlClientProvider messages={messages}>
          <Providers locale={locale as Locale}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

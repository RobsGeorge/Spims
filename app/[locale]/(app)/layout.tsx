import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getSession();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <AppShell user={user} locale={locale}>
      {children}
    </AppShell>
  );
}

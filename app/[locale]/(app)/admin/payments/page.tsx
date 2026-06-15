import { useTranslations } from "next-intl";
import { PaymentStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { ManualPaymentForm, PendingPayments } from "@/components/finance/manual-payment-form";

export default async function AdminPaymentsPage() {
  const t = useTranslations("finance");
  const session = await requireSession();
  await authorize(session, "payment.manual");

  const pending = await db.payment.findMany({
    where: { status: PaymentStatus.PENDING_VERIFICATION },
    include: { student: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t("paymentsTitle")}</h1>
      <section>
        <h2 className="text-lg font-medium mb-4">{t("pendingVerification")}</h2>
        <PendingPayments
          payments={pending.map((p) => ({
            id: p.id,
            amountMinor: p.amountMinor,
            currency: p.currency,
            method: p.method,
            gatewayRef: p.gatewayRef,
            student: p.student,
          }))}
        />
      </section>
      <section>
        <h2 className="text-lg font-medium mb-4">{t("recordManual")}</h2>
        <ManualPaymentForm />
      </section>
    </div>
  );
}

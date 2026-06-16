import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listInvoices, getAmountDue } from "@/lib/services/invoice";
import { InvoiceCheckout } from "@/components/finance/invoice-checkout";

export default async function BillingPage() {
  const t = await getTranslations("finance");
  const session = await requireSession();
  await authorize(session, "invoice.viewOwn");

  const invoices = await listInvoices(session);
  const withDue = await Promise.all(
    invoices.map(async (inv) => ({
      id: inv.id,
      status: inv.status,
      currency: inv.currency,
      totalMinor: inv.totalMinor,
      amountDue: await getAmountDue(inv.id),
      lines: inv.lines.map((l) => ({ description: l.description, amountMinor: l.amountMinor })),
    })),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("billingTitle")}</h1>
      <InvoiceCheckout invoices={withDue} />
    </div>
  );
}

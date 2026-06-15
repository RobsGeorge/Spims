/**
 * Phase-5 acceptance smoke script.
 */
import {
  PrismaClient,
  OfferingMode,
  OfferingStatus,
  PaymentMethod,
  RoleType,
} from "@prisma/client";
import { randomBytes } from "crypto";

const db = new PrismaClient();
const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

async function check(label: string, condition: boolean, detail = "") {
  console.log(`${condition ? "✓" : "✗"} ${label}${detail ? " — " + detail : ""}`);
  if (!condition) process.exitCode = 1;
}

async function createSessionUser(
  roles: RoleType[],
  extra: { countryCode?: string } = {},
) {
  const token = randomBytes(32).toString("hex");
  const user = await db.user.create({
    data: {
      email: `smoke-p5-${roles.join("-")}-${Date.now()}@test.local`,
      firstName: "Smoke",
      lastName: roles[0] ?? "User",
      emailVerified: true,
      status: "ACTIVE",
      countryCode: extra.countryCode ?? "US",
      roles: { create: roles.map((role) => ({ role })) },
      sessions: { create: { token, expiresAt: new Date(Date.now() + 600_000) } },
    },
  });
  return { user, cookie: `spims_session=${token}` };
}

async function main() {
  console.log("=== Phase-5 Acceptance Smoke ===\n");

  const { user: fin, cookie: finCookie } = await createSessionUser([RoleType.FINANCIAL_ADMIN]);
  const { user: aca, cookie: acaCookie } = await createSessionUser([RoleType.ACADEMIC_ADMIN]);
  const { user: student, cookie: studentCookie } = await createSessionUser([RoleType.STUDENT], {
    countryCode: "US",
  });
  const { user: studentEg, cookie: studentEgCookie } = await createSessionUser([RoleType.STUDENT], {
    countryCode: "EG",
  });

  const schemeRes = await fetch(`${BASE}/api/grading-schemes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      name: `P5 Scheme ${Date.now()}`,
      bands: [{ letter: "A", minPercent: 90, maxPercent: 100, gpaPoints: 4, isPassing: true }],
    }),
  });
  await schemeRes.json();

  const courseRes = await fetch(`${BASE}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      code: `P5${Date.now().toString().slice(-5)}`,
      title: "Finance Smoke Course",
      creditHours: 3,
      isFree: false,
      isStandalone: true,
    }),
  });
  await check("Create paid course → 201", courseRes.status === 201);
  const { course } = (await courseRes.json()) as { course: { id: string } };

  const pricingRes = await fetch(`${BASE}/api/courses/${course.id}/pricing`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: finCookie },
    body: JSON.stringify({ defaultPriceUsd: 15000, defaultPriceEgp: 75000 }),
  });
  await check("Set course pricing → 200", pricingRes.status === 200);

  const offeringRes = await fetch(`${BASE}/api/offerings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      courseId: course.id,
      mode: OfferingMode.SELF_PACED,
      status: OfferingStatus.OPEN,
    }),
  });
  const { offering } = (await offeringRes.json()) as { offering: { id: string } };

  const enrollRes = await fetch(`${BASE}/api/offerings/${offering.id}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ acknowledgeScheduleConflict: true }),
  });
  await check("Enroll paid course → 201", enrollRes.status === 201);

  const invoicesRes = await fetch(`${BASE}/api/invoices`, { headers: { Cookie: studentCookie } });
  await check("GET invoices → 200", invoicesRes.status === 200);
  const { invoices } = (await invoicesRes.json()) as {
    invoices: { id: string; currency: string; totalMinor: number }[];
  };
  const invoice = invoices[0];
  await check("Invoice created on enrollment", Boolean(invoice));
  await check("Invoice currency USD", invoice?.currency === "USD");
  await check("Invoice total 15000", invoice?.totalMinor === 15000);

  const enrollEg = await fetch(`${BASE}/api/offerings/${offering.id}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentEgCookie },
    body: JSON.stringify({ acknowledgeScheduleConflict: true }),
  });
  await check("EG student enroll → 201", enrollEg.status === 201);
  const invEgRes = await fetch(`${BASE}/api/invoices`, { headers: { Cookie: studentEgCookie } });
  const { invoices: invEg } = (await invEgRes.json()) as {
    invoices: { id: string; currency: string; totalMinor: number }[];
  };
  await check("EG invoice EGP", invEg[0]?.currency === "EGP");
  await check("EG invoice 75000", invEg[0]?.totalMinor === 75000);

  await db.walletAccount.upsert({
    where: { userId: student.id },
    create: { userId: student.id, usdMoneyMinor: 20000 },
    update: { usdMoneyMinor: 20000 },
  });

  const payRes = await fetch(`${BASE}/api/invoices/${invoice!.id}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      idempotencyKey: `smoke-pay-${Date.now()}`,
      allocations: [{ method: PaymentMethod.WALLET_MONEY, amountMinor: 15000 }],
    }),
  });
  await check("Pay via wallet → 200", payRes.status === 200);

  const paidInv = await db.invoice.findUnique({ where: { id: invoice!.id } });
  await check("Invoice PAID", paidInv?.status === "PAID");

  const receiptPayment = await db.payment.findFirst({
    where: { invoiceId: invoice!.id, status: "COMPLETED" },
  });
  const receiptRes = await fetch(`${BASE}/api/payments/${receiptPayment!.id}/receipt`, {
    headers: { Cookie: studentCookie },
  });
  const receiptBody = (await receiptRes.json()) as { payment: { receiptSerial: string | null } };
  await check("Receipt serial", Boolean(receiptBody.payment.receiptSerial));

  const idemKey = `idem-${Date.now()}`;
  const splitOfferingRes = await fetch(`${BASE}/api/offerings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      courseId: course.id,
      mode: OfferingMode.SELF_PACED,
      status: OfferingStatus.OPEN,
    }),
  });
  const { offering: offering2 } = (await splitOfferingRes.json()) as { offering: { id: string } };
  await fetch(`${BASE}/api/offerings/${offering2.id}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ acknowledgeScheduleConflict: true }),
  });
  const inv2Res = await fetch(`${BASE}/api/invoices`, { headers: { Cookie: studentCookie } });
  const { invoices: inv2List } = (await inv2Res.json()) as { invoices: { id: string }[] };
  const inv2 = inv2List.find((i) => i.id !== invoice!.id)!;

  await db.walletAccount.update({
    where: { userId: student.id },
    data: { usdMoneyMinor: 50000, usdPointsMinor: 10000 },
  });

  const splitBody = {
    idempotencyKey: idemKey,
    allocations: [
      { method: PaymentMethod.WALLET_MONEY, amountMinor: 10000 },
      { method: PaymentMethod.WALLET_POINTS, amountMinor: 5000 },
    ],
  };
  const split1 = await fetch(`${BASE}/api/invoices/${inv2.id}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify(splitBody),
  });
  const split2 = await fetch(`${BASE}/api/invoices/${inv2.id}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify(splitBody),
  });
  const body1 = await split1.json();
  const body2 = await split2.json();
  await check("Split payment", split1.status === 200);
  await check(
    "Idempotent replay",
    body1.batch?.id != null && body1.batch.id === body2.batch?.id,
    JSON.stringify(body1).slice(0, 120),
  );

  const manualRes = await fetch(`${BASE}/api/payments/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: finCookie },
    body: JSON.stringify({
      studentId: studentEg.id,
      invoiceId: invEg[0]!.id,
      currency: "EGP",
      amountMinor: 75000,
      method: "MANUAL_TRANSFER",
      reference: `BANK-${Date.now()}`,
    }),
  });
  await check("Manual payment → 201", manualRes.status === 201);
  const { payment: manualPay } = (await manualRes.json()) as { payment: { id: string } };
  const verifyRes = await fetch(`${BASE}/api/payments/${manualPay.id}/verify`, {
    method: "POST",
    headers: { Cookie: finCookie },
  });
  await check("Verify manual → 200", verifyRes.status === 200);

  const grantRes = await fetch(`${BASE}/api/wallet/points/grant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: finCookie },
    body: JSON.stringify({
      userId: student.id,
      currency: "USD",
      amountMinor: 3000,
      note: "Smoke grant",
    }),
  });
  await check("Grant points → 200", grantRes.status === 200);

  await db.walletAccount.update({
    where: { userId: student.id },
    data: { usdMoneyMinor: 5000 },
  });
  const donateRes = await fetch(`${BASE}/api/donations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      amountMinor: 1000,
      currency: "USD",
      kind: "MONEY",
      designation: "Scholarship",
    }),
  });
  await check("Donation → 201", donateRes.status === 201);

  const refundRes = await fetch(`${BASE}/api/refunds`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      paymentId: receiptPayment!.id,
      amountMinor: 2000,
      currency: "USD",
      reason: "Goodwill",
    }),
  });
  const { refund } = (await refundRes.json()) as { refund: { id: string } };
  const approveRes = await fetch(`${BASE}/api/refunds?approve=${refund.id}`, {
    method: "POST",
    headers: { Cookie: finCookie },
  });
  await check("Refund approve → 200", approveRes.status === 200);

  const holdOfferingRes = await fetch(`${BASE}/api/offerings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      courseId: course.id,
      mode: OfferingMode.SELF_PACED,
      status: OfferingStatus.OPEN,
    }),
  });
  const { offering: holdOffering } = (await holdOfferingRes.json()) as { offering: { id: string } };
  await fetch(`${BASE}/api/offerings/${holdOffering.id}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentEgCookie },
    body: JSON.stringify({ acknowledgeScheduleConflict: true }),
  });

  const holdOffering2Res = await fetch(`${BASE}/api/offerings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: acaCookie },
    body: JSON.stringify({
      courseId: course.id,
      mode: OfferingMode.SELF_PACED,
      status: OfferingStatus.OPEN,
    }),
  });
  const { offering: holdOffering2 } = (await holdOffering2Res.json()) as {
    offering: { id: string };
  };
  const blocked = await fetch(`${BASE}/api/offerings/${holdOffering2.id}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentEgCookie },
    body: JSON.stringify({ acknowledgeScheduleConflict: true }),
  });
  await check("Financial hold blocks enroll", blocked.status === 400 || blocked.status === 422);

  const gwPayment = await db.payment.create({
    data: {
      studentId: student.id,
      currency: "USD",
      amountMinor: 1000,
      method: PaymentMethod.PAYPAL,
      status: "PENDING",
      gatewayRef: `mock-webhook-${Date.now()}`,
    },
  });
  const eventId = `evt-${Date.now()}`;
  const whBody = JSON.stringify({ id: eventId, gatewayRef: gwPayment.gatewayRef });
  const wh1 = await fetch(`${BASE}/api/webhooks/paypal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-signature": "sig" },
    body: whBody,
  });
  const wh2 = await fetch(`${BASE}/api/webhooks/paypal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-signature": "sig" },
    body: whBody,
  });
  const wh1Body = (await wh1.json()) as { processed?: boolean };
  const wh2Body = (await wh2.json()) as { duplicate?: boolean };
  await check("Webhook processed", wh1.status === 200 && wh1Body.processed === true);
  await check("Webhook idempotent", wh2Body.duplicate === true);

  void fin;
  void aca;

  console.log("\n=== Phase-5 acceptance complete ===");
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { db } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage";
import PDFDocument from "pdfkit";

const RECEIPT_SETTING_KEY = "finance.receipt_serial";

export async function nextReceiptSerial(): Promise<string> {
  const row = await db.setting.findUnique({ where: { key: RECEIPT_SETTING_KEY } });
  const current = typeof row?.value === "number" ? row.value : Number(row?.value ?? 0);
  const next = current + 1;
  await db.setting.upsert({
    where: { key: RECEIPT_SETTING_KEY },
    create: { key: RECEIPT_SETTING_KEY, value: next },
    update: { value: next },
  });
  return `RCP-${String(next).padStart(6, "0")}`;
}

export async function generateReceiptPdf(opts: {
  serial: string;
  studentName: string;
  amountMinor: number;
  currency: string;
  method: string;
  locale?: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const major = (opts.amountMinor / 100).toFixed(2);
    doc.fontSize(18).text("Spims — Payment Receipt", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Receipt: ${opts.serial}`);
    doc.text(`Date: ${new Date().toISOString().slice(0, 10)}`);
    doc.text(`Payer: ${opts.studentName}`);
    doc.text(`Amount: ${major} ${opts.currency}`);
    doc.text(`Method: ${opts.method}`);
    doc.end();
  });
}

export async function finalizePaymentReceipt(paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { student: true },
  });
  if (!payment || payment.receiptSerial) return payment;

  const serial = await nextReceiptSerial();
  let receiptUrl: string | null = null;

  if (isStorageConfigured()) {
    const pdf = await generateReceiptPdf({
      serial,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      method: payment.method,
      locale: payment.student.preferredLocale,
    });
    const key = `receipts/${serial}.pdf`;
    const endpoint = process.env["STORAGE_ENDPOINT"]!.replace(/\/$/, "");
    const bucket = process.env["STORAGE_BUCKET"]!;
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: process.env["STORAGE_ENDPOINT"],
      credentials: {
        accessKeyId: process.env["STORAGE_KEY"]!,
        secretAccessKey: process.env["STORAGE_SECRET"]!,
      },
      forcePathStyle: true,
    });
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: pdf,
        ContentType: "application/pdf",
      }),
    );
    receiptUrl = `${endpoint}/${bucket}/${key}`;
  }

  return db.payment.update({
    where: { id: paymentId },
    data: { receiptSerial: serial, receiptUrl },
  });
}

export async function enqueueReceiptJob(paymentId: string) {
  try {
    const { enqueueJob } = await import("@/lib/jobs/queue");
    await enqueueJob("receipt-pdf", { paymentId });
  } catch {
    await finalizePaymentReceipt(paymentId);
  }
}

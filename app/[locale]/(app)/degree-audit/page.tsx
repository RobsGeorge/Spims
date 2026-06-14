import { useTranslations } from "next-intl";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { getDegreeAudit } from "@/lib/services/degreeAudit";

export default async function DegreeAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ programId?: string }>;
}) {
  const t = useTranslations();
  const session = await requireSession();
  await authorize(session, "degreeAudit.view");

  const programs = await db.studentProgram.findMany({
    where: { studentId: session.id, status: "ACTIVE" },
    include: { program: true },
  });

  const { programId } = await searchParams;
  const selected = programId ?? programs[0]?.programId;
  const audit = selected ? await getDegreeAudit(session.id, selected) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("degreeAudit.title")}</h1>
      {!audit ? (
        <p className="text-muted-foreground">{t("degreeAudit.noProgram")}</p>
      ) : (
        <>
          <p className="text-muted-foreground">{audit.program.name}</p>
          <div>
            <h2 className="font-medium mb-2">{t("degreeAudit.met")}</h2>
            <ul className="text-sm space-y-1">
              {audit.met.map((r) => (
                <li key={r.courseId}>✓ {r.courseCode} — {r.courseTitle}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-medium mb-2">{t("degreeAudit.remaining")}</h2>
            <ul className="text-sm space-y-1">
              {audit.remaining.map((r) => (
                <li key={r.courseId}>○ {r.courseCode} — {r.courseTitle}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

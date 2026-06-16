import { ComponentKind, GradeStatus, ScoringRule } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { scoreFromAttempts } from "@/lib/services/assessment";
import type { UpdateGradebookComponentsInput } from "@/lib/validation/assessment";

function assertWeightsSumTo100(components: Array<{ weightPercent: number }>) {
  const sum = components.reduce((acc, c) => acc + c.weightPercent, 0);
  if (Math.abs(sum - 100) > 0.001) {
    throw AppError.validation(`Component weights must sum to 100, got ${sum.toFixed(2)}`);
  }
}

export async function getGradebookComponents(offeringId: string) {
  return db.gradebookComponent.findMany({
    where: { offeringId },
    include: {
      assignments: { select: { id: true, maxPoints: true, itemWeight: true, released: true } },
      assessments: {
        select: { id: true, maxPoints: true, itemWeight: true, released: true, scoringRule: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function updateGradebookComponents(
  actor: SessionUser,
  offeringId: string,
  data: UpdateGradebookComponentsInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  assertWeightsSumTo100(data.components);
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { course: { include: { assessmentTemplate: { include: { components: true } } } } },
  });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  return withAudit(
    { actor, action: "gradebook.configure", entityType: "GradebookComponent", ...ctx },
    async (tx) => {
      await tx.gradebookComponent.deleteMany({ where: { offeringId } });
      const created = [];
      for (const c of data.components) {
        created.push(
          await tx.gradebookComponent.create({
            data: {
              offeringId,
              name: c.name,
              weightPercent: c.weightPercent,
              kind: c.kind,
            },
          }),
        );
      }
      return created;
    },
  );
}

export async function seedComponentsFromTemplate(offeringId: string) {
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { course: { include: { assessmentTemplate: { include: { components: true } } } } },
  });
  if (!offering?.course.assessmentTemplate) return [];

  const existing = await db.gradebookComponent.count({ where: { offeringId } });
  if (existing > 0) return getGradebookComponents(offeringId);

  const template = offering.course.assessmentTemplate;
  await db.gradebookComponent.createMany({
    data: template.components.map((c) => ({
      offeringId,
      name: c.name,
      weightPercent: c.weightPercent,
      kind: c.kind,
    })),
  });
  return getGradebookComponents(offeringId);
}

async function itemScorePercent(
  earned: number,
  max: number,
): Promise<number | null> {
  if (max <= 0) return null;
  return (earned / max) * 100;
}

async function assessmentItemPercent(
  assessment: {
    id: string;
    maxPoints: number;
    scoringRule: ScoringRule;
    released: boolean;
  },
  studentId: string,
  releasedOnly: boolean,
): Promise<number | null> {
  if (releasedOnly && !assessment.released) return null;
  const attempts = await db.assessmentAttempt.findMany({
    where: {
      assessmentId: assessment.id,
      studentId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "GRADED"] },
    },
  });
  const score = scoreFromAttempts(attempts, assessment.scoringRule);
  if (score == null) return null;
  return itemScorePercent(score, assessment.maxPoints);
}

async function assignmentItemPercent(
  assignment: { id: string; maxPoints: number; released: boolean },
  studentId: string,
  releasedOnly: boolean,
): Promise<number | null> {
  if (releasedOnly && !assignment.released) return null;
  const submission = await db.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } },
  });
  if (submission?.finalScore == null) return null;
  return itemScorePercent(submission.finalScore, assignment.maxPoints);
}

function weightedItemAverage(
  items: Array<{ percent: number; weight: number }>,
): number | null {
  if (items.length === 0) return null;
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) {
    return items.reduce((s, i) => s + i.percent, 0) / items.length;
  }
  return items.reduce((s, i) => s + i.percent * i.weight, 0) / totalWeight;
}

export async function computeComponentPercent(
  component: {
    id: string;
    kind: ComponentKind;
    assignments: Array<{ id: string; maxPoints: number; itemWeight: number | null; released: boolean }>;
    assessments: Array<{
      id: string;
      maxPoints: number;
      itemWeight: number | null;
      released: boolean;
      scoringRule: ScoringRule;
    }>;
  },
  studentId: string,
  releasedOnly: boolean,
): Promise<number | null> {
  if (component.kind === ComponentKind.ATTENDANCE || component.kind === ComponentKind.DISCUSSION) {
    return null;
  }

  const itemPercents: Array<{ percent: number; weight: number }> = [];

  for (const a of component.assignments) {
    const pct = await assignmentItemPercent(a, studentId, releasedOnly);
    if (pct != null) itemPercents.push({ percent: pct, weight: a.itemWeight ?? 1 });
  }
  for (const a of component.assessments) {
    const pct = await assessmentItemPercent(a, studentId, releasedOnly);
    if (pct != null) itemPercents.push({ percent: pct, weight: a.itemWeight ?? 1 });
  }

  return weightedItemAverage(itemPercents);
}

export async function computeEnrollmentPercent(
  offeringId: string,
  studentId: string,
  releasedOnly = false,
): Promise<{ percent: number | null; components: Array<{ id: string; name: string; percent: number | null; weightPercent: number }> }> {
  const components = await getGradebookComponents(offeringId);
  const results = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const c of components) {
    const pct = await computeComponentPercent(c, studentId, releasedOnly);
    results.push({ id: c.id, name: c.name, percent: pct, weightPercent: c.weightPercent });
    if (pct != null) {
      weightedSum += pct * (c.weightPercent / 100);
      weightTotal += c.weightPercent;
    }
  }

  const percent = weightTotal > 0 ? (weightedSum / weightTotal) * 100 : null;
  return { percent, components: results };
}

export async function getGradebook(
  offeringId: string,
  studentId: string,
  releasedOnly: boolean,
) {
  const enrollment = await db.enrollment.findUnique({
    where: { studentId_offeringId: { studentId, offeringId } },
    include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  if (!enrollment) throw AppError.notFound("Enrollment");

  const rollup = await computeEnrollmentPercent(offeringId, studentId, releasedOnly);
  return {
    enrollment: {
      id: enrollment.id,
      gradeStatus: enrollment.gradeStatus,
      finalPercent: enrollment.finalPercent,
      finalLetter: enrollment.finalLetter,
      gradeType: enrollment.gradeType,
    },
    student: enrollment.student,
    ...rollup,
  };
}

export async function getOfferingGradebook(
  offeringId: string,
  releasedOnly: boolean,
) {
  const enrollments = await db.enrollment.findMany({
    where: { offeringId, status: "ENROLLED" },
    include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });

  const rows = [];
  for (const e of enrollments) {
    const rollup = await computeEnrollmentPercent(offeringId, e.studentId, releasedOnly);
    rows.push({
      student: e.student,
      enrollmentId: e.id,
      gradeStatus: e.gradeStatus,
      ...rollup,
    });
  }
  return rows;
}

export function isGradeLocked(status: GradeStatus): boolean {
  return status === GradeStatus.LOCKED || status === GradeStatus.SUBMITTED;
}

import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { assertStudentEnrolled } from "@/lib/services/assessment";
import {
  applyLatePenalty,
  getLatePenaltyTiers,
} from "@/lib/services/latePenalty";
import type {
  CreateAssignmentInput,
  GradeSubmissionInput,
  SubmitAssignmentInput,
} from "@/lib/validation/assessment";

export async function listAssignments(offeringId: string) {
  return db.assignment.findMany({
    where: { contentItem: { week: { offeringId } } },
    include: {
      contentItem: { select: { id: true, title: true } },
      _count: { select: { submissions: true } },
    },
  });
}

export async function createAssignment(
  actor: SessionUser,
  offeringId: string,
  data: CreateAssignmentInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const item = await db.contentItem.findUnique({
    where: { id: data.contentItemId },
    include: { week: true, assignment: true },
  });
  if (!item || item.week.offeringId !== offeringId) {
    throw AppError.notFound("Content item");
  }
  if (item.assignment) throw AppError.conflict("Assignment already exists for this item");

  return withAudit(
    { actor, action: "offering.editContent", entityType: "Assignment", ...ctx },
    async (tx) =>
      tx.assignment.create({
        data: {
          contentItemId: data.contentItemId,
          componentId: data.componentId,
          instructions: data.instructions,
          submissionType: data.submissionType ?? "BOTH",
          allowedFileTypes: data.allowedFileTypes ?? [],
          maxPoints: data.maxPoints ?? 100,
          itemWeight: data.itemWeight,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          latePenaltyOverride: data.latePenaltyOverride,
          released: data.released ?? false,
        },
      }),
  );
}

export async function submitAssignment(
  actor: SessionUser,
  assignmentId: string,
  data: SubmitAssignmentInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { contentItem: { include: { week: true } } },
  });
  if (!assignment) throw AppError.notFound("Assignment");
  await assertStudentEnrolled(actor.id, assignment.contentItem.week.offeringId);

  if (!data.textBody && !data.fileUrl) {
    throw AppError.validation("Submission must include text or file");
  }

  const submittedAt = new Date();
  const isLate = assignment.dueDate ? submittedAt > assignment.dueDate : false;

  return withAudit(
    { actor, action: "assessment.take", entityType: "AssignmentSubmission", ...ctx },
    async (tx) =>
      tx.assignmentSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId, studentId: actor.id } },
        create: {
          assignmentId,
          studentId: actor.id,
          textBody: data.textBody,
          fileUrl: data.fileUrl,
          submittedAt,
          isLate,
        },
        update: {
          textBody: data.textBody,
          fileUrl: data.fileUrl,
          submittedAt,
          isLate,
        },
      }),
  );
}

export async function gradeSubmission(
  actor: SessionUser,
  submissionId: string,
  data: GradeSubmissionInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const submission = await db.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });
  if (!submission) throw AppError.notFound("Submission");

  const tiers = await getLatePenaltyTiers();
  const { finalScore } = applyLatePenalty(
    data.rawScore,
    submission.assignment.dueDate,
    submission.submittedAt,
    tiers,
    submission.isLate ? submission.assignment.latePenaltyOverride : null,
  );

  return withAudit(
    {
      actor,
      action: "assessment.grade",
      entityType: "AssignmentSubmission",
      entityId: submissionId,
      ...ctx,
    },
    async (tx) =>
      tx.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          rawScore: data.rawScore,
          finalScore,
          feedback: data.feedback,
          gradedById: actor.id,
          gradedAt: new Date(),
        },
      }),
  );
}

export async function getAssignmentScorePercent(
  assignmentId: string,
  studentId: string,
): Promise<number | null> {
  const submission = await db.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    include: { assignment: true },
  });
  if (!submission || submission.finalScore == null) return null;
  return (submission.finalScore / submission.assignment.maxPoints) * 100;
}

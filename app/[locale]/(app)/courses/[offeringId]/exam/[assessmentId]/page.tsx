import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getAssessmentById, assertStudentEnrolled } from "@/lib/services/assessment";
import { db } from "@/lib/db";
import { ExamRunner } from "@/components/exam/exam-runner";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ offeringId: string; assessmentId: string }>;
}) {
  const session = await requireSession();
  await authorize(session, "assessment.take");
  const { offeringId, assessmentId } = await params;

  const assessment = await getAssessmentById(assessmentId);
  if (assessment.offeringId !== offeringId) {
    return null;
  }
  await assertStudentEnrolled(session.id, offeringId);

  const inProgress = await db.assessmentAttempt.findFirst({
    where: {
      assessmentId,
      studentId: session.id,
      status: "IN_PROGRESS",
    },
    include: {
      assessment: {
        select: {
          title: true,
          enforceFullScreen: true,
          oneAtATime: true,
          noBacktrack: true,
          logFocusLoss: true,
        },
      },
      answers: true,
    },
  });

  return (
    <ExamRunner
      assessmentId={assessmentId}
      initialAttempt={inProgress as Parameters<typeof ExamRunner>[0]["initialAttempt"]}
    />
  );
}

import { OfferingMode, RoleType, ThreadVisibility } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { isOfferingStaff } from "@/lib/services/offeringScope";
import { notifyDiscussionReply } from "@/lib/services/notification";
import type {
  CreatePostInput,
  CreateThreadInput,
  OverrideDiscussionGradesInput,
  UpdateDiscussionBoardInput,
  UpdatePostInput,
  UpdateThreadInput,
} from "@/lib/validation/discussion";

const POST_EDIT_WINDOW_MS = 15 * 60 * 1000;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function computeParticipationScore(
  thread: {
    isGraded: boolean;
    participationMinWords: number | null;
    participationMinPosts: number | null;
    participationMinReplies: number | null;
  },
  posts: Array<{ body: string; parentPostId: string | null }>,
): number | null {
  if (!thread.isGraded) return null;

  const totalWords = posts.reduce((s, p) => s + countWords(p.body), 0);
  const postCount = posts.filter((p) => !p.parentPostId).length;
  const replyCount = posts.filter((p) => p.parentPostId).length;

  const checks: boolean[] = [];
  if (thread.participationMinWords != null) checks.push(totalWords >= thread.participationMinWords);
  if (thread.participationMinPosts != null) checks.push(postCount >= thread.participationMinPosts);
  if (thread.participationMinReplies != null) checks.push(replyCount >= thread.participationMinReplies);
  if (checks.length === 0) return 100;

  const met = checks.filter(Boolean).length;
  return Math.round((met / checks.length) * 100);
}

export async function ensureDiscussionBoard(offeringId: string) {
  const offering = await db.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  const existing = await db.discussionBoard.findUnique({ where: { offeringId } });
  if (existing) return existing;

  return db.discussionBoard.create({
    data: {
      offeringId,
      allowStudentThreads: offering.mode === OfferingMode.COHORT,
    },
  });
}

export async function getDiscussionBoard(offeringId: string) {
  return ensureDiscussionBoard(offeringId);
}

export async function updateDiscussionBoard(
  actor: SessionUser,
  offeringId: string,
  data: UpdateDiscussionBoardInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const board = await ensureDiscussionBoard(offeringId);
  return withAudit(
    {
      actor,
      action: "discussion.configure",
      entityType: "DiscussionBoard",
      entityId: board.id,
      after: data,
      ...ctx,
    },
    async (tx) =>
      tx.discussionBoard.update({
        where: { id: board.id },
        data,
      }),
  );
}

async function assertCanViewThread(userId: string, roles: RoleType[], threadId: string) {
  const thread = await db.discussionThread.findUnique({
    where: { id: threadId },
    include: { board: true },
  });
  if (!thread) throw AppError.notFound("Thread");

  const staff = await isOfferingStaff(userId, thread.board.offeringId);
  const isAdmin =
    roles.includes(RoleType.SUPER_ADMIN) ||
    roles.includes(RoleType.ACADEMIC_ADMIN) ||
    roles.includes(RoleType.ADMINISTRATIVE_ADMIN);

  if (thread.visibility === ThreadVisibility.PRIVATE_TO_INSTRUCTOR) {
    if (thread.authorId !== userId && !staff && !isAdmin) {
      throw AppError.forbidden("Private thread — instructor only");
    }
  }

  return thread;
}

export async function listThreads(boardId: string, userId: string, roles: RoleType[]) {
  const board = await db.discussionBoard.findUnique({ where: { id: boardId } });
  if (!board) throw AppError.notFound("Board");

  const staff = await isOfferingStaff(userId, board.offeringId);
  const isAdmin =
    roles.includes(RoleType.SUPER_ADMIN) ||
    roles.includes(RoleType.ACADEMIC_ADMIN);

  const threads = await db.discussionThread.findMany({
    where: {
      boardId,
      ...(staff || isAdmin
        ? {}
        : {
            OR: [{ visibility: ThreadVisibility.OPEN }, { authorId: userId }],
          }),
    },
    include: {
      _count: { select: { posts: true } },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return threads;
}

export async function createThread(
  actor: SessionUser,
  boardId: string,
  data: CreateThreadInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const board = await db.discussionBoard.findUnique({
    where: { id: boardId },
    include: { offering: true },
  });
  if (!board) throw AppError.notFound("Board");

  const staff = await isOfferingStaff(actor.id, board.offeringId);
  const isStudent = actor.roles.includes(RoleType.STUDENT);
  if (isStudent && !staff && !board.allowStudentThreads) {
    throw AppError.forbidden("Students cannot create threads on this board");
  }
  if (board.offering.mode === OfferingMode.SELF_PACED && data.isGraded) {
    throw AppError.validation("Self-paced offerings support ungraded Q&A only");
  }

  return withAudit(
    {
      actor,
      action: "discussion.thread.create",
      entityType: "DiscussionThread",
      entityId: boardId,
      after: data,
      ...ctx,
    },
    async (tx) =>
      tx.discussionThread.create({
        data: {
          boardId,
          authorId: actor.id,
          title: data.title,
          visibility: data.visibility ?? ThreadVisibility.OPEN,
          isGraded: data.isGraded ?? false,
          participationMinWords: data.participationMinWords ?? null,
          participationMinPosts: data.participationMinPosts ?? null,
          participationMinReplies: data.participationMinReplies ?? null,
        },
      }),
  );
}

export async function updateThread(
  actor: SessionUser,
  threadId: string,
  data: UpdateThreadInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const thread = await db.discussionThread.findUnique({
    where: { id: threadId },
    include: { board: true },
  });
  if (!thread) throw AppError.notFound("Thread");

  const staff = await isOfferingStaff(actor.id, thread.board.offeringId);
  if (!staff) throw AppError.forbidden("Not assigned to this offering");

  return withAudit(
    {
      actor,
      action: "discussion.thread.update",
      entityType: "DiscussionThread",
      entityId: threadId,
      after: data,
      ...ctx,
    },
    async (tx) => tx.discussionThread.update({ where: { id: threadId }, data }),
  );
}

export async function listPosts(threadId: string, userId: string, roles: RoleType[]) {
  await assertCanViewThread(userId, roles, threadId);
  return db.discussionPost.findMany({
    where: { threadId, deletedAt: null },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function refreshThreadGrade(threadId: string, studentId: string) {
  const thread = await db.discussionThread.findUnique({ where: { id: threadId } });
  if (!thread?.isGraded) return;

  const posts = await db.discussionPost.findMany({
    where: { threadId, authorId: studentId, deletedAt: null },
    select: { body: true, parentPostId: true },
  });

  const autoScore = computeParticipationScore(thread, posts);
  const existing = await db.discussionGrade.findUnique({
    where: { threadId_studentId: { threadId, studentId } },
  });
  if (existing?.overridden) return existing;

  return db.discussionGrade.upsert({
    where: { threadId_studentId: { threadId, studentId } },
    create: { threadId, studentId, autoScore, finalScore: autoScore },
    update: { autoScore, finalScore: autoScore },
  });
}

export async function createPost(
  actor: SessionUser,
  threadId: string,
  data: CreatePostInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const thread = await db.discussionThread.findUnique({
    where: { id: threadId },
    include: { board: true },
  });
  if (!thread) throw AppError.notFound("Thread");
  if (thread.locked) throw AppError.conflict("Thread is locked");

  await assertCanViewThread(actor.id, actor.roles, threadId);

  const post = await withAudit(
    {
      actor,
      action: "discussion.post.create",
      entityType: "DiscussionPost",
      entityId: threadId,
      ...ctx,
    },
    async (tx) =>
      tx.discussionPost.create({
        data: {
          threadId,
          authorId: actor.id,
          body: data.body,
          parentPostId: data.parentPostId ?? null,
          attachments: data.attachments ?? [],
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
  );

  await refreshThreadGrade(threadId, actor.id);

  if (data.parentPostId) {
    const parent = await db.discussionPost.findUnique({
      where: { id: data.parentPostId },
      select: { authorId: true },
    });
    if (parent && parent.authorId !== actor.id) {
      await notifyDiscussionReply(
        parent.authorId,
        thread.title,
        `${actor.firstName} ${actor.lastName}`,
      );
    }
  }

  return post;
}

export async function updatePost(
  actor: SessionUser,
  postId: string,
  data: UpdatePostInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const post = await db.discussionPost.findUnique({
    where: { id: postId },
    include: { thread: { include: { board: true } } },
  });
  if (!post || post.deletedAt) throw AppError.notFound("Post");

  const staff = await isOfferingStaff(actor.id, post.thread.board.offeringId);
  const isAuthor = post.authorId === actor.id;
  if (!staff && !isAuthor) throw AppError.forbidden("Cannot edit this post");
  if (isAuthor && !staff) {
    const elapsed = Date.now() - post.createdAt.getTime();
    if (elapsed > POST_EDIT_WINDOW_MS) {
      throw AppError.forbidden("Edit window expired");
    }
  }

  const updated = await withAudit(
    {
      actor,
      action: "discussion.post.update",
      entityType: "DiscussionPost",
      entityId: postId,
      ...ctx,
    },
    async (tx) =>
      tx.discussionPost.update({
        where: { id: postId },
        data: { body: data.body, editedAt: new Date() },
      }),
  );

  await refreshThreadGrade(post.threadId, post.authorId);
  return updated;
}

export async function deletePost(
  actor: SessionUser,
  postId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const post = await db.discussionPost.findUnique({
    where: { id: postId },
    include: { thread: { include: { board: true } } },
  });
  if (!post || post.deletedAt) throw AppError.notFound("Post");

  const staff = await isOfferingStaff(actor.id, post.thread.board.offeringId);
  const isAuthor = post.authorId === actor.id;
  if (!staff && !isAuthor) throw AppError.forbidden("Cannot delete this post");
  if (isAuthor && !staff) {
    const elapsed = Date.now() - post.createdAt.getTime();
    if (elapsed > POST_EDIT_WINDOW_MS) {
      throw AppError.forbidden("Delete window expired");
    }
  }

  return withAudit(
    {
      actor,
      action: "discussion.post.delete",
      entityType: "DiscussionPost",
      entityId: postId,
      ...ctx,
    },
    async (tx) =>
      tx.discussionPost.update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      }),
  );
}

export async function overrideThreadGrades(
  actor: SessionUser,
  threadId: string,
  data: OverrideDiscussionGradesInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const thread = await db.discussionThread.findUnique({
    where: { id: threadId },
    include: { board: true },
  });
  if (!thread) throw AppError.notFound("Thread");
  if (!thread.isGraded) throw AppError.validation("Thread is not graded");

  const staff = await isOfferingStaff(actor.id, thread.board.offeringId);
  if (!staff) throw AppError.forbidden("Not assigned to this offering");

  return withAudit(
    {
      actor,
      action: "discussion.grade.override",
      entityType: "DiscussionThread",
      entityId: threadId,
      after: data,
      ...ctx,
    },
    async (tx) => {
      const results = [];
      for (const g of data.grades) {
        results.push(
          await tx.discussionGrade.upsert({
            where: { threadId_studentId: { threadId, studentId: g.studentId } },
            create: {
              threadId,
              studentId: g.studentId,
              finalScore: g.finalScore,
              overridden: true,
              feedback: g.feedback ?? null,
              gradedById: actor.id,
              gradedAt: new Date(),
            },
            update: {
              finalScore: g.finalScore,
              overridden: true,
              feedback: g.feedback ?? null,
              gradedById: actor.id,
              gradedAt: new Date(),
            },
          }),
        );
      }
      return results;
    },
  );
}

export async function computeDiscussionPercent(offeringId: string, studentId: string): Promise<number | null> {
  const board = await db.discussionBoard.findUnique({ where: { offeringId } });
  if (!board) return null;

  const gradedThreads = await db.discussionThread.findMany({
    where: { boardId: board.id, isGraded: true },
    select: { id: true },
  });
  if (gradedThreads.length === 0) return null;

  const grades = await db.discussionGrade.findMany({
    where: {
      threadId: { in: gradedThreads.map((t) => t.id) },
      studentId,
    },
  });

  const scores = grades
    .map((g) => g.finalScore ?? g.autoScore)
    .filter((s): s is number => s != null);
  if (scores.length === 0) return null;

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

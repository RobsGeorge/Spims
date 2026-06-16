import { z } from "zod";
import { ThreadVisibility } from "@prisma/client";

export const updateDiscussionBoardSchema = z.object({
  allowStudentThreads: z.boolean().optional(),
});

export const createThreadSchema = z.object({
  title: z.string().min(1).max(200),
  visibility: z.nativeEnum(ThreadVisibility).optional(),
  isGraded: z.boolean().optional(),
  participationMinWords: z.number().int().positive().optional(),
  participationMinPosts: z.number().int().positive().optional(),
  participationMinReplies: z.number().int().positive().optional(),
});

export const updateThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  visibility: z.nativeEnum(ThreadVisibility).optional(),
  locked: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export const createPostSchema = z.object({
  body: z.string().min(1).max(10000),
  parentPostId: z.string().optional(),
  attachments: z.array(z.string().url()).optional(),
});

export const updatePostSchema = z.object({
  body: z.string().min(1).max(10000).optional(),
});

export const overrideDiscussionGradesSchema = z.object({
  grades: z.array(
    z.object({
      studentId: z.string().min(1),
      finalScore: z.number().min(0).max(100),
      feedback: z.string().max(2000).optional(),
    }),
  ),
});

export type UpdateDiscussionBoardInput = z.infer<typeof updateDiscussionBoardSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type UpdateThreadInput = z.infer<typeof updateThreadSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type OverrideDiscussionGradesInput = z.infer<typeof overrideDiscussionGradesSchema>;

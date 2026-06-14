import { z } from "@/lib/validation";
import { ProgramType, RequirementType } from "@prisma/client";

export const createProgramSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase(),
  name: z.string().min(1).max(200),
  type: z.nativeEnum(ProgramType),
  passingThreshold: z.number().min(0).max(100).optional().default(60),
  maxCreditsPerSemester: z.number().int().positive(),
  maxCoursesPerSemester: z.number().int().positive(),
  maxSemestersToGraduate: z.number().int().positive(),
  electiveCreditsRequired: z.number().int().min(0).optional().default(0),
  signatoryName: z.string().max(200).optional(),
  signatoryTitle: z.string().max(200).optional(),
  gradingSchemeId: z.string().optional(),
});

export const updateProgramSchema = createProgramSchema.partial();

export const programRequirementSchema = z.object({
  courseId: z.string().min(1),
  requirement: z.nativeEnum(RequirementType),
  yearLevel: z.number().int().positive().optional(),
});

export const setProgramRequirementsSchema = z.object({
  requirements: z.array(programRequirementSchema),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type SetProgramRequirementsInput = z.infer<typeof setProgramRequirementsSchema>;

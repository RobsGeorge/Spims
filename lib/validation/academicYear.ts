import { z } from "@/lib/validation";

export const createAcademicYearSchema = z.object({
  name: z.string().min(1).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;

import { z } from "@/lib/validation";

export const uploadUrlSchema = z.object({
  offeringId: z.string().min(1),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
});

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

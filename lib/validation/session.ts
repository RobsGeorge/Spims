import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";

export const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  scheduledStart: z.string().datetime(),
  durationMinutes: z.number().int().positive().max(480),
});

export const createRecurrenceSchema = z.object({
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().positive().max(480),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  title: z.string().min(1).max(200),
});

export const overrideAttendanceSchema = z.object({
  studentId: z.string().min(1),
  status: z.nativeEnum(AttendanceStatus),
});

export const importAttendanceSchema = z.object({
  participants: z
    .array(
      z.object({
        email: z.string().email(),
        durationMinutes: z.number().int().min(0),
      }),
    )
    .optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CreateRecurrenceInput = z.infer<typeof createRecurrenceSchema>;
export type OverrideAttendanceInput = z.infer<typeof overrideAttendanceSchema>;
export type ImportAttendanceInput = z.infer<typeof importAttendanceSchema>;

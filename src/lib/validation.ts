import { z } from "zod";

export const cardBoardTypeSchema = z.enum(["BUG", "FEATURE", "TASK"]);
export const cardPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const decisionStatusSchema = z.enum(["OPEN", "DISCUSS", "BLOCKING", "RESOLVED"]);

const optionalNullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value.trim() ? value : null;
  });

const optionalNullableDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value === null || value.trim() === "") return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "dueDate must be a valid date" });
      return z.NEVER;
    }
    return date;
  });

export const createCardSchema = z
  .object({
    boardType: cardBoardTypeSchema,
    title: z.string().trim().min(1, "title is required").max(180, "title is too long"),
    description: optionalNullableString,
    assigneeId: optionalNullableString,
    priority: z.union([cardPrioritySchema, z.null()]).optional(),
    dueDate: optionalNullableDate,
  })
  .strict();

export const updateCardSchema = z
  .object({
    column: z.string().trim().min(1).max(80).optional(),
    title: z.string().trim().min(1, "title is required").max(180, "title is too long").optional(),
    description: optionalNullableString,
    assigneeId: optionalNullableString,
    priority: z.union([cardPrioritySchema, z.null()]).optional(),
    dueDate: optionalNullableDate,
    archived: z.boolean().optional(),
  })
  .strict();

export const createCommentSchema = z
  .object({
    text: z.string().trim().min(1, "text is required").max(3000, "text is too long"),
  })
  .strict();

export const createDecisionSchema = z
  .object({
    title: z.string().trim().min(1, "title is required").max(180, "title is too long"),
    note: optionalNullableString,
    ownerId: optionalNullableString,
    status: decisionStatusSchema.optional(),
  })
  .strict();

export const updateDecisionSchema = z
  .object({
    title: z.string().trim().min(1, "title is required").max(180, "title is too long").optional(),
    note: optionalNullableString,
    ownerId: optionalNullableString,
    status: decisionStatusSchema.optional(),
  })
  .strict();

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

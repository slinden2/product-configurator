import type { z } from "zod";

/**
 * First Zod issue message (Italian — our schemas carry localized messages),
 * with a fallback for the degenerate empty-issues case. Use this instead of
 * `ZodError.message`, which in Zod 4 is a JSON blob of the raw issues array
 * (English structural keys) and must never reach the UI.
 */
export function firstZodIssueMessage(
  error: z.ZodError,
  fallback: string,
): string {
  return error.issues[0]?.message ?? fallback;
}

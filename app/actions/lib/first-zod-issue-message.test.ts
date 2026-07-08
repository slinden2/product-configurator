import { describe, expect, test } from "vitest";
import { z } from "zod";
import { firstZodIssueMessage } from "@/app/actions/lib/first-zod-issue-message";

describe("firstZodIssueMessage", () => {
  test("returns the first issue's message when issues exist", () => {
    const schema = z.object({
      name: z.string().min(1, "Il nome è obbligatorio."),
    });
    const result = schema.safeParse({ name: "" });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(firstZodIssueMessage(result.error, "fallback")).toBe(
      "Il nome è obbligatorio.",
    );
  });

  test("returns the fallback when the error carries no issues", () => {
    const emptyError = new z.ZodError([]);

    expect(firstZodIssueMessage(emptyError, "Errore sconosciuto.")).toBe(
      "Errore sconosciuto.",
    );
  });
});

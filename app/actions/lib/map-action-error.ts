import { DatabaseError } from "pg";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

export function mapActionError(err: unknown, logContext?: string) {
  console.error(logContext ?? "Action failed:", err);
  if (err instanceof QueryError) {
    return { success: false as const, error: err.message };
  }
  if (err instanceof DatabaseError) {
    return { success: false as const, error: MSG.db.error };
  }
  return { success: false as const, error: MSG.db.unknown };
}

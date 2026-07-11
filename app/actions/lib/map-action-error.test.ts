import { DatabaseError } from "pg";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mapActionError } from "@/app/actions/lib/map-action-error";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

// The barrel pulls in db/index.ts (requires DATABASE_URL); the errors module
// alone provides the real QueryError class without touching the database.
vi.mock("@/db/queries", () => import("@/db/queries/errors"));

const createDatabaseError = (message: string) =>
  new DatabaseError(message, 0, "error");

describe("mapActionError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("QueryError returns its controlled Italian message", () => {
    const result = mapActionError(new QueryError("Messaggio controllato."));
    expect(result).toEqual({
      success: false,
      error: "Messaggio controllato.",
    });
  });

  test("DatabaseError returns the generic DB message, never the raw pg error", () => {
    const result = mapActionError(createDatabaseError("duplicate key value"));
    expect(result).toEqual({ success: false, error: MSG.db.error });
  });

  test("unknown error returns the unknown-error message", () => {
    const result = mapActionError(new Error("boom"));
    expect(result).toEqual({ success: false, error: MSG.db.unknown });
  });

  test("logs the error with the given context", () => {
    const err = new Error("boom");
    mapActionError(err, "Failed to do the thing:");
    expect(console.error).toHaveBeenCalledWith("Failed to do the thing:", err);
  });

  test("logs with a default context when none is given", () => {
    const err = createDatabaseError("boom");
    mapActionError(err);
    expect(console.error).toHaveBeenCalledWith("Action failed:", err);
  });
});

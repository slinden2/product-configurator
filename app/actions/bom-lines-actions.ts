"use server";

import { DatabaseError } from "pg";
import { getAssemblyChildren, getUserData, QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

export async function getAssemblyChildrenAction(parentPn: string) {
  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  const pn = parentPn?.trim();
  if (!pn) {
    return { success: true as const, data: [] };
  }

  try {
    const data = await getAssemblyChildren(pn);
    return { success: true as const, data };
  } catch (err) {
    console.error("Failed to fetch assembly children:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}

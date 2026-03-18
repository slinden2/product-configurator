import { ConfigurationStatusType, Role } from "@/types";

/**
 * Determines whether a configuration is currently in an editable state
 * based on the User's Role and the Record's Status.
 * * Rules:
 * - LOCKED/CLOSED: Never editable by anyone.
 * - EXTERNAL: Editable only in DRAFT.
 * - INTERNAL/ADMIN: Editable in DRAFT or OPEN.
 */
export function isEditable(
  status: ConfigurationStatusType,
  role: Role
): boolean {
  // 1. Hard stop: Locked and Closed are read-only for all roles
  if (status === "LOCKED" || status === "CLOSED") {
    return false;
  }

  // 2. Role-based permissions for active states
  if (role === "EXTERNAL") {
    return status === "DRAFT";
  }

  if (role === "INTERNAL" || role === "ADMIN") {
    return status === "DRAFT" || status === "OPEN";
  }

  return false;
}
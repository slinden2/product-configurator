import { ConfigurationStatusType, Role } from "@/types";

/**
 * Determines whether a configuration is currently in an editable state
 * based on the User's Role and the Record's Status.
 * * Rules:
 * - APPROVED/CLOSED: Never editable by anyone.
 * - EXTERNAL: Editable only in DRAFT.
 * - INTERNAL/ADMIN: Editable in DRAFT, SUBMITTED, or IN_REVIEW.
 */
export function isEditable(
  status: ConfigurationStatusType,
  role: Role
): boolean {
  // 1. Hard stop: Approved and Closed are read-only for all roles
  if (status === "APPROVED" || status === "CLOSED") {
    return false;
  }

  // 2. Role-based permissions for active states
  if (role === "EXTERNAL") {
    return status === "DRAFT";
  }

  if (role === "INTERNAL" || role === "ADMIN") {
    return status === "DRAFT" || status === "SUBMITTED" || status === "IN_REVIEW";
  }

  return false;
}
import { ConfigurationStatusType, Role } from "@/types";

/**
 * Determines whether a user with the given role can edit a configuration
 * in the given status, following the operational constraints:
 *
 * - EXTERNAL: can edit only DRAFT
 * - INTERNAL: can edit OPEN and LOCKED
 * - ADMIN: can edit any status
 */
export function isEditable(
  status: ConfigurationStatusType,
  role: Role
): boolean {
  if (role === "ADMIN") return true;
  if (role === "EXTERNAL" && status === "DRAFT") return true;
  if (role === "INTERNAL" && (status === "OPEN" || status === "LOCKED"))
    return true;
  return false;
}

import { isEditable } from "@/app/actions/lib/auth-checks";
import type { ConfigurationStatusType, Role } from "@/types";

export const canViewBom = (role: Role): boolean =>
  role === "ENGINEER" || role === "ADMIN";

export const canViewOffer = (role: Role): boolean =>
  role === "SALES" || role === "ADMIN";

/** Returns true when the config cannot be edited (status frozen, unknown role, or unknown status). */
export const isConfigLocked = (
  status: ConfigurationStatusType | undefined,
  role: Role | undefined,
): boolean => !status || !role || !isEditable(status, role);

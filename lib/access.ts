import type { Role } from "@/types";

export const canViewBom = (role: Role): boolean =>
  role === "ENGINEER" || role === "ADMIN";

export const canViewOffer = (role: Role): boolean =>
  role === "SALES" || role === "ADMIN";

import { z } from "zod";
import { Roles } from "@/types";

export const changeRoleSchema = z.object({
  userId: z.uuid(),
  newRole: z.enum(Roles),
});
export type ChangeRoleSchema = z.infer<typeof changeRoleSchema>;

export const sendPasswordResetSchema = z.object({
  userId: z.uuid(),
});
export type SendPasswordResetSchema = z.infer<typeof sendPasswordResetSchema>;

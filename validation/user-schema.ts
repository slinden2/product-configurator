import { z } from "zod";
import { Roles } from "@/types";

export const changeRoleSchema = z.object({
  userId: z.uuid(),
  newRole: z.enum(Roles),
});
export type ChangeRoleSchema = z.infer<typeof changeRoleSchema>;

export const assignManagerSchema = z.object({
  userId: z.uuid(),
  managerId: z.uuid().nullable(),
});
export type AssignManagerSchema = z.infer<typeof assignManagerSchema>;

export const sendPasswordResetSchema = z.object({
  userId: z.uuid(),
});
export type SendPasswordResetSchema = z.infer<typeof sendPasswordResetSchema>;

export const activateUserSchema = z.object({
  userId: z.uuid(),
});
export type ActivateUserSchema = z.infer<typeof activateUserSchema>;

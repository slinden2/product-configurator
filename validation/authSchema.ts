import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Email non valida."),
});

export const loginSchema = authSchema.extend({
  password: z.string(),
  rememberme: z.boolean().default(false),
});

export const signupSchema = authSchema.extend({
  password: z.string().min(6, "Password deve contenere almeno 6 caratteri."),
});

export type AuthFormData = z.infer<typeof authSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

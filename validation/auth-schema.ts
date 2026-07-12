import { z } from "zod";
import { MSG } from "@/lib/messages";

export const authSchema = z.object({
  email: z
    .email("Email non valida.")
    .refine(
      (email) => email.endsWith("@itecosrl.com"),
      MSG.auth.emailDomainNotAllowed,
    ),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Password deve contenere almeno 8 caratteri."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Le password non corrispondono.",
    path: ["confirmPassword"],
  });

export const loginSchema = authSchema.extend({
  password: z.string(),
});

export const signupSchema = authSchema.and(newPasswordSchema);

export type AuthSchema = z.infer<typeof authSchema>;
export type NewPasswordSchema = z.infer<typeof newPasswordSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
export type SignupSchema = z.infer<typeof signupSchema>;

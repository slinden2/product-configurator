import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Email non valida."),
});

export const newPassWordSchema = z
  .object({
    password: z.string().min(6, "Password deve contenere almeno 6 caratteri."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non corrispondono.",
    path: ["confirmPassword"],
  });

export const loginSchema = authSchema.extend({
  password: z.string(),
});

export const signupSchema = authSchema.and(newPassWordSchema);

export type AuthSchema = z.infer<typeof authSchema>;
export type NewPasswordSchema = z.infer<typeof newPassWordSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
export type SignupSchema = z.infer<typeof signupSchema>;

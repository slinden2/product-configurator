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

export type AuthFormData = z.infer<typeof authSchema>;
export type NewPassWordFormData = z.infer<typeof newPassWordSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

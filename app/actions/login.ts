"use server";

import { LoginFormData, loginSchema } from "@/validation/authSchema";
import { z } from "zod";

export async function login(formData: LoginFormData) {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  try {
    loginSchema.parse(formData);

    return {
      success: true,
      message: "Accesso effettuato con successo.",
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors = err.flatten().fieldErrors;

      return {
        success: false,
        message: "Validazione dati fallita.",
        errors,
      };
    }

    console.error(err);
    return {
      success: false,
      message: "Qualcosa è andato storto.",
    };
  }
}

"use server";

import { AuthFormData, authSchema } from "@/validation/authSchema";
import { z } from "zod";

export async function forogtPassword(formData: AuthFormData) {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  try {
    authSchema.parse(formData);

    return {
      success: true,
      message: "Recupero password effettuato con successo.",
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

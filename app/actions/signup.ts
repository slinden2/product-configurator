"use server";

import { SignupFormData, signupSchema } from "@/validation/authSchema";
import { z } from "zod";

export async function signup(formData: SignupFormData) {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  try {
    signupSchema.parse(formData);

    return {
      success: true,
      message: "Account creato con successo.",
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

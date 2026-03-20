"use server";

import { z } from "zod";
import {
  getUserData,
  getConfiguration,
  QueryError,
  hasEngineeringBom,
  deleteAllEngineeringBomItems,
} from "@/db/queries";
import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { isEditable } from "@/app/actions/lib/auth-checks";

type ActionType = "insert" | "edit" | "delete";

interface HandleSubRecordOptions<TFormSchema extends z.ZodTypeAny> {
  actionType: ActionType;
  parentId: number;
  recordId?: number;
  formData?: unknown;
  schema?: TFormSchema;
  insertQueryFn?: (
    parentId: number,
    data: z.infer<TFormSchema>
  ) => Promise<any>;
  updateQueryFn?: (
    parentId: number,
    recordId: number,
    data: z.infer<TFormSchema>
  ) => Promise<any>;
  deleteQueryFn?: (
    parentId: number,
    recordId: number
  ) => Promise<{ success: boolean; error?: string }>;
  revalidatePathStr: string;
  entityName: string;
}

/**
 * Generic handler for Insert, Update, Delete operations on sub-records
 * related to a parent configuration. Handles validation, auth, execution,
 * error handling, and cache revalidation.
 */
export async function handleSubRecordAction<TFormSchema extends z.ZodTypeAny>(
  options: HandleSubRecordOptions<TFormSchema>
) {
  const {
    actionType,
    parentId,
    recordId,
    formData,
    schema,
    insertQueryFn,
    updateQueryFn,
    deleteQueryFn,
    revalidatePathStr,
    entityName,
  } = options;

  let validatedData: z.infer<TFormSchema> | undefined;

  // --- 1. Validation (for Insert/Edit) ---
  if (actionType === "insert" || actionType === "edit") {
    if (!schema || formData === undefined) {
      throw new Error(
        `Schema and formData are required for ${actionType} action.`
      );
    }
    const validation = schema.safeParse(formData);
    if (!validation.success) {
      console.error(`Invalid ${entityName} data:`, validation.error.flatten());
      throw new Error(
        validation.error?.message || `Dati ${entityName} non validi.`
      );
    }
    validatedData = validation.data;
  }

  // --- 2. Authentication ---
  const user = await getUserData();
  if (!user) {
    throw new Error("Utente non trovato o non autenticato.");
  }

  // --- 3. Authorization & Status Protection ---
  const configuration = await getConfiguration(parentId);
  if (!configuration) {
    throw new Error("Configurazione associata non trovata.");
  }

  // Check if user owns the config, is INTERNAL, or is ADMIN
  if (
    user.id !== configuration.user_id &&
    user.role !== "ADMIN" &&
    user.role !== "INTERNAL"
  ) {
    throw new Error("Non autorizzato a modificare/eliminare questo record.");
  }

  // Status protection: enforce editable rules per role
  if (!isEditable(configuration.status, user.role)) {
    throw new Error(
      "Non è possibile modificare i record di una configurazione in questo stato."
    );
  }

  if ((actionType === "edit" || actionType === "delete") && !recordId) {
    throw new Error(`Record ID mancante per l'azione ${actionType}.`);
  }

  // --- 4. Database Operation ---
  try {
    let result: any;
    switch (actionType) {
      case "insert":
        if (!insertQueryFn || validatedData === undefined)
          throw new Error("Insert function or data missing.");
        result = await insertQueryFn(parentId, validatedData);
        break;
      case "edit":
        if (
          !updateQueryFn ||
          validatedData === undefined ||
          recordId === undefined
        )
          throw new Error("Update function, data, or recordId missing.");
        result = await updateQueryFn(parentId, recordId, validatedData);
        break;
      case "delete":
        if (!deleteQueryFn || recordId === undefined)
          throw new Error("Delete function or recordId missing.");
        result = await deleteQueryFn(parentId, recordId);
        // Check specific success flag for delete actions
        if (!result?.success) {
          throw new Error(
            result?.error || `Impossibile eliminare ${entityName}.`
          );
        }
        break;
      default:
        throw new Error("Azione non valida.");
    }

    // --- 5. Delete engineering BOM if it exists — config changes invalidate the snapshot ---
    const ebomExists = await hasEngineeringBom(parentId);
    if (ebomExists) {
      await deleteAllEngineeringBomItems(parentId);
    }

    // --- 6. Cache Revalidation ---
    revalidatePath(revalidatePathStr);
    revalidatePath(`/configurations/bom/${parentId}`);

    // --- 7. Return Success ---
    return { success: true, data: result };
  } catch (err) {
    // --- 7. Error Handling ---
    console.error(`Failed to ${actionType} ${entityName}:`, err);
    // Check for specific DB/Query errors if needed
    if (err instanceof QueryError || err instanceof DatabaseError) {
      throw new Error(err.message); // Re-throw specific DB errors
    }
    // Re-throw custom errors or generic ones
    if (err instanceof Error) {
      throw err; // Re-throw errors from deleteQueryFn or auth checks
    }
    // Fallback generic error
    throw new Error(
      `Errore sconosciuto durante l'operazione ${actionType} su ${entityName}.`
    );
  }
}

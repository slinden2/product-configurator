"use server";

import { z } from "zod";
import {
  getUserData,
  getConfiguration,
  QueryError,
  hasEngineeringBom,
  deleteAllEngineeringBomItems,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { isEditable } from "@/app/actions/lib/auth-checks";

// --- Types ---

type QueryResult = { success: boolean; id: { id: number } };

type SubRecordActionResult =
  | { success: true; data: QueryResult }
  | { success: false; error: string };

interface SubRecordOptionsBase {
  parentId: number;
  revalidatePathStr: string;
  entityName: string;
}

interface InsertSubRecordOptions<TFormSchema extends z.ZodTypeAny>
  extends SubRecordOptionsBase {
  actionType: "insert";
  formData: unknown;
  schema: TFormSchema;
  queryFn: (
    parentId: number,
    data: z.infer<TFormSchema>
  ) => Promise<QueryResult>;
}

interface EditSubRecordOptions<TFormSchema extends z.ZodTypeAny>
  extends SubRecordOptionsBase {
  actionType: "edit";
  recordId: number;
  formData: unknown;
  schema: TFormSchema;
  queryFn: (
    parentId: number,
    recordId: number,
    data: z.infer<TFormSchema>
  ) => Promise<QueryResult>;
}

interface DeleteSubRecordOptions extends SubRecordOptionsBase {
  actionType: "delete";
  recordId: number;
  queryFn: (
    parentId: number,
    recordId: number
  ) => Promise<QueryResult>;
}

type SubRecordOptions<TFormSchema extends z.ZodTypeAny> =
  | InsertSubRecordOptions<TFormSchema>
  | EditSubRecordOptions<TFormSchema>
  | DeleteSubRecordOptions;

/**
 * Generic handler for Insert, Update, Delete operations on sub-records
 * related to a parent configuration. Handles validation, auth, execution,
 * error handling, and cache revalidation.
 */
export async function handleSubRecordAction<
  TFormSchema extends z.ZodTypeAny = z.ZodTypeAny,
>(options: SubRecordOptions<TFormSchema>): Promise<SubRecordActionResult> {
  const { actionType, parentId, revalidatePathStr, entityName } = options;

  // --- 1. Validation (for Insert/Edit) ---
  let validatedData: z.infer<TFormSchema> | undefined;
  if (actionType === "insert" || actionType === "edit") {
    const validation = options.schema.safeParse(options.formData);
    if (!validation.success) {
      console.error(
        `Invalid ${entityName} data:`,
        validation.error.flatten()
      );
      return {
        success: false as const,
        error: validation.error?.message || MSG.entity.invalidData(entityName),
      };
    }
    validatedData = validation.data;
  }

  // --- 2. Authentication ---
  const user = await getUserData();
  if (!user) {
    return {
      success: false as const,
      error: MSG.auth.userNotAuthenticated,
    };
  }

  // --- 3. Authorization & Status Protection ---
  const configuration = await getConfiguration(parentId);
  if (!configuration) {
    return {
      success: false as const,
      error: MSG.config.associatedNotFound,
    };
  }

  if (
    user.id !== configuration.user_id &&
    user.role !== "ADMIN" &&
    user.role !== "INTERNAL"
  ) {
    return {
      success: false as const,
      error: MSG.auth.unauthorizedSubRecord,
    };
  }

  if (!isEditable(configuration.status, user.role)) {
    return {
      success: false as const,
      error: MSG.config.cannotEditSubRecord,
    };
  }

  // --- 4. Database Operation ---
  try {
    let result: QueryResult;
    switch (options.actionType) {
      case "insert":
        result = await options.queryFn(parentId, validatedData!);
        break;
      case "edit":
        result = await options.queryFn(parentId, options.recordId, validatedData!);
        break;
      case "delete":
        result = await options.queryFn(parentId, options.recordId);
        break;
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
    return { success: true as const, data: result };
  } catch (err) {
    console.error(`Failed to ${actionType} ${entityName}:`, err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    if (err instanceof Error) {
      return { success: false as const, error: err.message };
    }
    return {
      success: false as const,
      error: MSG.entity.unknownError(actionType, entityName),
    };
  }
}

"use server";

import { z } from "zod";
import {
  getUserData,
  getConfiguration,
  QueryError,
  hasEngineeringBom,
  deleteAllEngineeringBomItems,
  touchConfigurationUpdatedAt,
  type DatabaseType,
  type TransactionType,
} from "@/db/queries";
import { db } from "@/db";
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
    data: z.infer<TFormSchema>,
    tx: DatabaseType | TransactionType,
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
    data: z.infer<TFormSchema>,
    tx: DatabaseType | TransactionType,
  ) => Promise<QueryResult>;
}

interface DeleteSubRecordOptions extends SubRecordOptionsBase {
  actionType: "delete";
  recordId: number;
  queryFn: (
    parentId: number,
    recordId: number,
    tx: DatabaseType | TransactionType,
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
      console.error(`Invalid ${entityName} data:`, validation.error.flatten());
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
    user.role !== "ENGINEER"
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

  // --- 4. Database Operation (atomic transaction) ---
  try {
    let operationResult!: QueryResult;

    await db.transaction(async (tx) => {
      switch (options.actionType) {
        case "insert":
          operationResult = await options.queryFn(parentId, validatedData!, tx);
          break;
        case "edit":
          operationResult = await options.queryFn(
            parentId,
            options.recordId,
            validatedData!,
            tx,
          );
          break;
        case "delete":
          operationResult = await options.queryFn(
            parentId,
            options.recordId,
            tx,
          );
          break;
      }

      // Touch parent configuration's updated_at
      await touchConfigurationUpdatedAt(parentId, tx);

      // Delete engineering BOM if it exists — config changes invalidate the snapshot
      const ebomExists = await hasEngineeringBom(parentId, tx);
      if (ebomExists) {
        await deleteAllEngineeringBomItems(parentId, tx);
      }
    });

    // --- 5. Cache Revalidation ---
    revalidatePath(revalidatePathStr);
    revalidatePath(`/configurations/bom/${parentId}`);

    // --- 6. Return Success ---
    return { success: true as const, data: operationResult };
  } catch (err) {
    console.error(`Failed to ${actionType} ${entityName}:`, err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return {
      success: false as const,
      error: MSG.entity.unknownError(actionType, entityName),
    };
  }
}

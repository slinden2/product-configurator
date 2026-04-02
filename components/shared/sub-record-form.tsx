"use client";

import type React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { MSG } from "@/lib/messages";
import { FormDisabledContext } from "@/components/ui/form";
import Fieldset from "@/components/fieldset";
import BomWarningDialog from "@/components/shared/bom-warning-dialog";
import type { z } from "zod";
import type { ConfigurationStatusType, Role } from "@/types";
import { isEditable } from "@/app/actions/lib/auth-checks";

// Shared result type for server actions
interface ActionResult {
  success: boolean;
  error?: string;
}

// --- Generic Props Interface ---
interface SubRecordFormProps<TFormSchema extends z.ZodTypeAny> {
  parentId: number; // ID of the parent (e.g., confId)
  parentStatus: ConfigurationStatusType;
  userRole?: Role;
  schema: TFormSchema; // Zod schema for validation
  entityDefaults: z.infer<TFormSchema>; // Default values for new entity
  entityData?: z.infer<TFormSchema> & { id: number }; // Optional existing data (must have id)
  entityName: "Serbatoio" | "Pista"; // Name for UI text (e.g., "Serbatoio")
  entityIndex?: number; // Optional index for titles
  onDelete?: (id: number) => void; // Callback after delete
  onSaveSuccess: (entityName: "Serbatoio" | "Pista") => void; // Callback after save/update
  formKey?: string;
  onDirtyChange?: (key: string, isDirty: boolean) => void;
  onSaved?: (key: string) => void;
  // Server Actions
  insertAction: (
    parentId: number,
    values: z.infer<TFormSchema>,
  ) => Promise<ActionResult>;
  editAction: (
    parentId: number,
    id: number,
    values: z.infer<TFormSchema>,
  ) => Promise<ActionResult>;
  deleteAction: (parentId: number, id: number) => Promise<ActionResult>;
  hasEngineeringBom?: boolean;
  // Component to render the specific fields
  FieldsComponent: React.ComponentType;
}

// Use ZodTypeAny for the generic constraint
const SubRecordForm = <TFormSchema extends z.ZodTypeAny>({
  parentId,
  parentStatus,
  userRole,
  schema,
  entityDefaults,
  entityData,
  entityName,
  entityIndex,
  onDelete,
  onSaveSuccess,
  formKey,
  onDirtyChange,
  onSaved,
  insertAction,
  editAction,
  deleteAction,
  hasEngineeringBom,
  FieldsComponent,
}: SubRecordFormProps<TFormSchema>) => {
  // Infer the TS type from the Zod schema
  type FormData = z.infer<TFormSchema>;

  // --- State & Form Hook ---
  const [isLoading, setIsLoading] = useState<"submit" | "delete" | false>(
    false,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBomWarning, setShowBomWarning] = useState(false);
  const pendingValuesRef = useRef<FormData | null>(null);
  const pendingActionRef = useRef<"save" | "delete" | null>(null);

  const formIsDisabled =
    !!isLoading || !userRole || !isEditable(parentStatus, userRole);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: entityData
      ? { ...entityDefaults, ...entityData }
      : entityDefaults,
  });
  const { handleSubmit, reset, formState } = form;

  useEffect(() => {
    if (formKey) onDirtyChange?.(formKey, formState.isDirty);
  }, [formState.isDirty, formKey, onDirtyChange]);

  useEffect(() => {
    if (formState.isSubmitSuccessful) {
      reset(form.getValues());
    }
  }, [formState.isSubmitSuccessful, reset, form]);

  // --- Derived State ---
  const isEditing = !!entityData?.id;
  const isSaveOrCancelDisabled =
    formIsDisabled || (isEditing && !formState.isDirty);
  const isDeleteDisabled = formIsDisabled;

  // --- Event Handlers ---
  const executeSave = useCallback(
    async (values: FormData) => {
      setIsLoading("submit");
      try {
        if (isEditing) {
          const result = await editAction(parentId, entityData.id, values);
          if (!result.success) {
            throw new Error(
              result.error || MSG.toast.entityUpdateFallback(entityName),
            );
          }
          toast.success(MSG.toast.entityUpdated(entityName, entityIndex));
          reset(values);
          if (formKey) {
            onSaved?.(formKey);
            onDirtyChange?.(formKey, false);
          }
        } else {
          const result = await insertAction(parentId, values);
          if (!result.success) {
            throw new Error(
              result.error || MSG.toast.entityCreateFallback(entityName),
            );
          }
          toast.success(MSG.toast.entityCreated(entityName));
          reset(entityDefaults);
          if (formKey) onSaved?.(formKey);
          onSaveSuccess(entityName);
        }
      } catch (err) {
        console.error(`Save ${entityName} Error:`, err);
        const message =
          err instanceof Error
            ? err.message
            : MSG.toast.entitySaveUnknown(entityName);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      isEditing,
      parentId,
      entityData,
      entityIndex,
      reset,
      onSaveSuccess,
      editAction,
      insertAction,
      entityDefaults,
      entityName,
      formKey,
      onSaved,
      onDirtyChange,
    ],
  );

  const handleSaveSubmit = useCallback(
    async (values: FormData) => {
      if (hasEngineeringBom) {
        pendingValuesRef.current = values;
        pendingActionRef.current = "save";
        setShowBomWarning(true);
        return;
      }
      await executeSave(values);
    },
    [hasEngineeringBom, executeSave],
  );

  const executeDelete = useCallback(async () => {
    if (!isEditing || !onDelete) return;

    setIsLoading("delete");
    try {
      const result = await deleteAction(parentId, entityData.id);
      if (result.success) {
        toast.success(MSG.toast.entityDeleted(entityName, entityIndex));
        onDelete(entityData.id);
      } else {
        throw new Error(
          result.error || MSG.toast.entityDeleteFailed(entityName),
        );
      }
    } catch (err) {
      console.error(`Delete ${entityName} Error:`, err);
      const message =
        err instanceof Error
          ? err.message
          : MSG.toast.entityDeleteUnknown(entityName);
      toast.error(message);
      setIsLoading(false);
    }
  }, [
    isEditing,
    parentId,
    entityData,
    entityIndex,
    onDelete,
    deleteAction,
    entityName,
  ]);

  const handleDelete = useCallback(() => {
    if (!isEditing || !onDelete) return;
    setShowDeleteConfirm(true);
  }, [isEditing, onDelete]);

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    if (hasEngineeringBom) {
      pendingActionRef.current = "delete";
      setShowBomWarning(true);
      return;
    }
    await executeDelete();
  }, [hasEngineeringBom, executeDelete]);

  const handleBomWarningConfirm = useCallback(async () => {
    setShowBomWarning(false);
    if (pendingActionRef.current === "save" && pendingValuesRef.current) {
      const values = pendingValuesRef.current;
      pendingValuesRef.current = null;
      pendingActionRef.current = null;
      await executeSave(values);
    } else if (pendingActionRef.current === "delete") {
      pendingActionRef.current = null;
      await executeDelete();
    }
  }, [executeSave, executeDelete]);

  const handleCancel = useCallback(() => {
    reset(entityData ?? entityDefaults);
    if (formKey) onDirtyChange?.(formKey, false);
    // Hide add form if cancelling add mode
    if (!isEditing) {
      onSaveSuccess(entityName);
    }
  }, [
    reset,
    entityData,
    entityDefaults,
    isEditing,
    onSaveSuccess,
    entityName,
    formKey,
    onDirtyChange,
  ]);

  return (
    <div>
      <Form {...form}>
        <FormDisabledContext.Provider value={formIsDisabled}>
          <fieldset disabled={formIsDisabled} className="group">
            <form
              id={formKey ? `form-${formKey}` : undefined}
              onSubmit={handleSubmit(handleSaveSubmit)}
            >
              <Fieldset
                title={
                  isEditing
                    ? `${entityName} ${entityIndex}`
                    : `Aggiungi ${entityName === "Pista" ? "nuova" : "nuovo"} ${entityName}`
                }
              >
                {/* Render the specific fields passed as a component */}
                <FieldsComponent />

                <div className="flex items-center gap-4 pt-4 border-t border-border mt-4 group-disabled:opacity-50">
                  {/* Delete Button */}
                  {isEditing && onDelete && (
                    <Button
                      className="ml-auto"
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleteDisabled}
                      aria-label={`Elimina ${entityName} ${entityIndex}`}
                    >
                      {isLoading === "delete" ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Elimina</span>
                    </Button>
                  )}

                  {/* Cancel Button */}
                  <Button
                    className={!isEditing ? "ml-auto" : ""}
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaveOrCancelDisabled}
                  >
                    <RotateCcw />
                    <span className="hidden sm:inline">Annulla</span>
                  </Button>

                  {/* Save/Add Button */}
                  <Button
                    type="submit"
                    disabled={isSaveOrCancelDisabled}
                    className="gap-1.5 min-w-[100px] sm:min-w-[140px]"
                  >
                    {isLoading === "submit" ? (
                      <Spinner className="h-4 w-4 text-foreground" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{isEditing ? "Salva" : `Aggiungi`}</span>
                  </Button>
                </div>
              </Fieldset>
            </form>
          </fieldset>
        </FormDisabledContext.Provider>
      </Form>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              {`Sei sicuro di voler eliminare ${entityName} ${entityIndex ?? ""}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BomWarningDialog
        open={showBomWarning}
        onOpenChange={setShowBomWarning}
        onCancel={() => {
          pendingValuesRef.current = null;
          pendingActionRef.current = null;
        }}
        onConfirm={handleBomWarningConfirm}
      />
    </div>
  );
};

export default SubRecordForm;

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import Fieldset from "@/components/fieldset";
import SaveWarningDialog from "@/components/shared/save-warning-dialog";
import { SubmitButton } from "@/components/shared/submit-button";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Form, FormDisabledContext } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { isConfigLocked } from "@/lib/access";
import { MSG } from "@/lib/messages";
import type { ConfigurationStatusType, Role } from "@/types";

// Shared result type for server actions
interface ActionResult {
  success: boolean;
  error?: string;
}

// --- Generic Props Interface ---
interface SubRecordFormProps<
  TData extends FieldValues,
  TFormSchema extends z.ZodType<TData>,
> {
  parentId: number; // ID of the parent (e.g., confId)
  parentStatus: ConfigurationStatusType;
  userRole?: Role;
  schema: TFormSchema; // Zod schema for validation
  entityDefaults: TData; // Default values for new entity
  entityData?: TData & { id: number }; // Optional existing data (must have id)
  entityName: "Serbatoio" | "Pista"; // Name for UI text (e.g., "Serbatoio")
  entityIndex?: number; // Optional index for titles
  onDelete?: (id: number) => void; // Callback after delete
  onSaveSuccess: (entityName: "Serbatoio" | "Pista") => void; // Callback after save/update
  formKey?: string;
  onDirtyChange?: (key: string, isDirty: boolean) => void;
  onSaved?: (key: string) => void;
  // Server Actions
  insertAction: (parentId: number, values: TData) => Promise<ActionResult>;
  editAction: (
    parentId: number,
    id: number,
    values: TData,
  ) => Promise<ActionResult>;
  deleteAction: (parentId: number, id: number) => Promise<ActionResult>;
  hasEngineeringBom?: boolean;
  hasOfferSnapshot?: boolean;
  // Component to render the specific fields
  FieldsComponent: React.ComponentType;
}

const SubRecordForm = <
  TData extends FieldValues,
  TFormSchema extends z.ZodType<TData>,
>({
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
  hasOfferSnapshot,
  FieldsComponent,
}: SubRecordFormProps<TData, TFormSchema>) => {
  type FormData = TData;

  // --- State & Form Hook ---
  const [isLoading, setIsLoading] = useState<"submit" | "delete" | false>(
    false,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const pendingValuesRef = useRef<FormData | null>(null);
  const pendingActionRef = useRef<"save" | "delete" | null>(null);

  const formIsDisabled = !!isLoading || isConfigLocked(parentStatus, userRole);

  // Zod v4 defaults Input=unknown in ZodType<O>; cast to ZodType<TData, FieldValues> so
  // zodResolver's overload resolves correctly. All Zod object schemas satisfy this at runtime.
  const form = useForm<FieldValues, unknown, TData>({
    resolver: zodResolver(schema as z.ZodType<TData, FieldValues>),
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
      if (hasEngineeringBom || hasOfferSnapshot) {
        pendingValuesRef.current = values;
        pendingActionRef.current = "save";
        setShowSaveWarning(true);
        return;
      }
      await executeSave(values);
    },
    [hasEngineeringBom, hasOfferSnapshot, executeSave],
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
    if (hasEngineeringBom || hasOfferSnapshot) {
      pendingActionRef.current = "delete";
      setShowSaveWarning(true);
      return;
    }
    await executeDelete();
  }, [hasEngineeringBom, hasOfferSnapshot, executeDelete]);

  const handleSaveWarningConfirm = useCallback(async () => {
    setShowSaveWarning(false);
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
                  <SubmitButton
                    isSubmitting={isLoading === "submit"}
                    icon={<Save />}
                    disabled={isSaveOrCancelDisabled}
                    className="min-w-25 sm:min-w-35"
                  >
                    {isEditing ? "Salva" : "Aggiungi"}
                  </SubmitButton>
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
              className={buttonVariants({ variant: "destructive" })}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SaveWarningDialog
        open={showSaveWarning}
        onOpenChange={setShowSaveWarning}
        onCancel={() => {
          pendingValuesRef.current = null;
          pendingActionRef.current = null;
        }}
        onConfirm={handleSaveWarningConfirm}
        hasEngineeringBom={!!hasEngineeringBom}
        hasOfferSnapshot={!!hasOfferSnapshot}
      />
    </div>
  );
};

export default SubRecordForm;

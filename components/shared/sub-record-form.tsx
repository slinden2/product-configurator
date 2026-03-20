"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { FormDisabledContext } from "@/components/ui/form";
import Fieldset from "@/components/fieldset";
import { z } from "zod";
import { ConfigurationStatusType, Role } from "@/types";
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
    values: z.infer<TFormSchema>
  ) => Promise<ActionResult>;
  editAction: (
    parentId: number,
    id: number,
    values: z.infer<TFormSchema>
  ) => Promise<ActionResult>;
  deleteAction: (
    parentId: number,
    id: number
  ) => Promise<ActionResult>;
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
  FieldsComponent, // Destructure the FieldsComponent
}: SubRecordFormProps<TFormSchema>) => {
  // Infer the TS type from the Zod schema
  type FormData = z.infer<TFormSchema>;

  // --- State & Form Hook ---
  const [isLoading, setIsLoading] = useState<"submit" | "delete" | false>(
    false
  );
  const [error, setError] = useState<string>("");
  const [showBomWarning, setShowBomWarning] = useState(false);
  const pendingValuesRef = useRef<FormData | null>(null);
  const pendingActionRef = useRef<"save" | "delete" | null>(null);

  const formIsDisabled = !!isLoading || !userRole || !isEditable(parentStatus, userRole);

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

  // --- Derived State ---
  const isEditing = !!entityData?.id;
  const isSaveOrCancelDisabled =
    formIsDisabled || (isEditing && !formState.isDirty);
  const isDeleteDisabled = formIsDisabled;

  // --- Event Handlers ---
  const executeSave = useCallback(
    async (values: FormData) => {
      setIsLoading("submit");
      setError("");
      try {
        if (isEditing) {
          const result = await editAction(parentId, entityData.id, values);
          if (!result.success) {
            throw new Error(result.error || `Errore durante l'aggiornamento (${entityName}).`);
          }
          toast.success(
            `${entityName} ${entityIndex ?? ""} aggiornat${entityName === "Pista" ? "a" : "o"
            }.`
          );
          reset(values);
          if (formKey) onSaved?.(formKey);
        } else {
          const result = await insertAction(parentId, values);
          if (!result.success) {
            throw new Error(result.error || `Errore durante la creazione (${entityName}).`);
          }
          toast.success(
            `${entityName} creat${entityName === "Pista" ? "a" : "o"}.`
          );
          reset(entityDefaults);
          if (formKey) onSaved?.(formKey);
          onSaveSuccess(entityName);
        }
      } catch (err) {
        console.error(`Save ${entityName} Error:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Errore sconosciuto durante il salvataggio (${entityName}).`;
        setError(message);
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
    ]
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
    [hasEngineeringBom, executeSave]
  );

  const executeDelete = useCallback(async () => {
    if (!isEditing || !onDelete) return;

    setIsLoading("delete");
    setError("");
    try {
      const result = await deleteAction(parentId, entityData.id!);
      if (result.success) {
        toast.success(
          `${entityName} ${entityIndex} eliminat${entityName === "Pista" ? "a" : "o"
          }.`
        );
        onDelete(entityData.id!);
      } else {
        throw new Error(result.error || `Impossibile eliminare ${entityName}.`);
      }
    } catch (err) {
      console.error(`Delete ${entityName} Error:`, err);
      const message =
        err instanceof Error
          ? err.message
          : `Errore sconosciuto durante l'eliminazione (${entityName}).`;
      setError(message);
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

  const handleDelete = useCallback(async () => {
    if (!isEditing || !onDelete) return;
    const confirmMessage = `Sei sicuro di voler eliminare ${entityName} ${entityIndex ?? ""
      }?`;
    if (!window.confirm(confirmMessage)) return;

    if (hasEngineeringBom) {
      pendingActionRef.current = "delete";
      setShowBomWarning(true);
      return;
    }
    await executeDelete();
  }, [isEditing, onDelete, entityName, entityIndex, hasEngineeringBom, executeDelete]);

  const handleBomWarningConfirm = useCallback(() => {
    setShowBomWarning(false);
    if (pendingActionRef.current === "save" && pendingValuesRef.current) {
      const values = pendingValuesRef.current;
      pendingValuesRef.current = null;
      pendingActionRef.current = null;
      executeSave(values);
    } else if (pendingActionRef.current === "delete") {
      pendingActionRef.current = null;
      executeDelete();
    }
  }, [executeSave, executeDelete]);

  const handleCancel = useCallback(() => {
    reset(entityData ?? entityDefaults);
    // Hide add form if cancelling add mode
    if (!isEditing) {
      onSaveSuccess(entityName);
    }
  }, [reset, entityData, entityDefaults, isEditing, onSaveSuccess, entityName]);

  return (
    <div>
      <Form {...form}>
        <FormDisabledContext.Provider value={formIsDisabled}>
          <fieldset disabled={formIsDisabled} className="group">
            <form id={formKey ? `form-${formKey}` : undefined} onSubmit={handleSubmit(handleSaveSubmit)}>
              <Fieldset
                title={
                  isEditing
                    ? `${entityName} ${entityIndex}`
                    : `Aggiungi Nuovo ${entityName}`
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
      {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
      <AlertDialog open={showBomWarning} onOpenChange={setShowBomWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Distinta ingegneria presente</AlertDialogTitle>
            <AlertDialogDescription>
              Salvando le modifiche alla configurazione, la distinta ingegneria
              verrà eliminata e dovrà essere rigenerata. Continuare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                pendingValuesRef.current = null;
                pendingActionRef.current = null;
              }}
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBomWarningConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Salva e elimina distinta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubRecordForm;

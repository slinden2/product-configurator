"use client";

import React, { useState, useCallback } from "react";
import { Form } from "@/components/ui/form";
import { useForm, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import Fieldset from "@/components/fieldset"; // Assuming Fieldset is general purpose
import { z } from "zod";
import { DevTool } from "@hookform/devtools";
import { ConfigurationStatusType } from "@/types";

// --- Generic Props Interface ---
interface SubRecordFormProps<TFormSchema extends z.ZodTypeAny> {
  parentId: number; // ID of the parent (e.g., confId)
  parentStatus: ConfigurationStatusType;
  schema: TFormSchema; // Zod schema for validation
  entityDefaults: z.infer<TFormSchema>; // Default values for new entity
  entityData?: z.infer<TFormSchema> & { id: number }; // Optional existing data (must have id)
  entityName: "Serbatoio" | "Pista"; // Name for UI text (e.g., "Serbatoio")
  entityIndex?: number; // Optional index for titles
  onDelete?: (id: number) => void; // Callback after delete
  onSaveSuccess: (entityName: "Serbatoio" | "Pista") => void; // Callback after save/update
  // Server Actions (adjust signatures as needed)
  insertAction: (
    parentId: number,
    values: z.infer<TFormSchema>
  ) => Promise<any>;
  editAction: (
    parentId: number,
    id: number,
    values: z.infer<TFormSchema>
  ) => Promise<any>;
  deleteAction: (
    parentId: number,
    id: number
  ) => Promise<{ success: boolean; error?: string }>;
  // Component to render the specific fields
  FieldsComponent: React.ComponentType;
}

// Use ZodTypeAny for the generic constraint
const SubRecordForm = <TFormSchema extends z.ZodTypeAny>({
  parentId,
  parentStatus,
  schema,
  entityDefaults,
  entityData,
  entityName,
  entityIndex,
  onDelete,
  onSaveSuccess,
  insertAction,
  editAction,
  deleteAction,
  FieldsComponent, // Destructure the FieldsComponent
}: SubRecordFormProps<TFormSchema>) => {
  // Infer the TS type from the Zod schema
  type FormData = z.infer<TFormSchema>;

  // --- State & Form Hook ---
  const [isLoading, setIsLoading] = useState<"submit" | "delete" | false>(
    false
  );
  const [error, setError] = useState<string>("");

  const formIsDisabled = !!isLoading || parentStatus === "LOCKED" || parentStatus === "CLOSED";

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: entityData ?? entityDefaults,
    disabled: formIsDisabled,
  });
  const { handleSubmit, reset, formState } = form;

  // --- Derived State ---
  const isEditing = !!entityData?.id;
  const isSaveOrCancelDisabled =
    !!isLoading || (isEditing && !formState.isDirty) || formState.disabled;
  const isDeleteDisabled = !!isLoading || formState.disabled;

  // --- Event Handlers ---
  const handleSaveSubmit = useCallback(
    async (values: FormData) => {
      console.log("🚀 ~ onSubmit ~ values:", values); // DEBUG
      setIsLoading("submit");
      setError("");
      try {
        if (isEditing) {
          await editAction(parentId, entityData.id, values);
          toast.success(
            `${entityName} ${entityIndex ?? ""} aggiornat${entityName === "Pista" ? "a" : "o"
            }.`
          );
          reset(values);
        } else {
          await insertAction(parentId, values);
          toast.success(
            `${entityName} creat${entityName === "Pista" ? "a" : "o"}.`
          );
          reset(entityDefaults);
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
    ]
  );

  const handleDelete = useCallback(async () => {
    if (!isEditing || !onDelete) return;
    const confirmMessage = `Sei sicuro di voler eliminare ${entityName} ${entityIndex ?? ""
      }?`;
    if (!window.confirm(confirmMessage)) return;

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

  const handleCancel = useCallback(() => {
    reset(entityData ?? entityDefaults);
    // Hide add form if cancelling add mode
    if (!isEditing) {
      onSaveSuccess(entityName);
    }
  }, [reset, entityData, entityDefaults, isEditing, onSaveSuccess, entityName]);

  return (
    <div>
      <DevTool control={form.control} />
      <Form {...form}>
        <fieldset disabled={!!isLoading} className="group">
          <form onSubmit={handleSubmit(handleSaveSubmit)}>
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
      </Form>
      {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
    </div>
  );
};

export default SubRecordForm;

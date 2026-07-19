"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { ConfirmModal } from "@/components/confirm-modal";
import Fieldset from "@/components/fieldset";
import { FormDisabledContext } from "@/components/shared/form-disabled-context";
import SaveWarningDialog from "@/components/shared/save-warning-dialog";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { isConfigLocked } from "@/lib/access";
import { MSG, SUB_RECORD_ENTITY_META } from "@/lib/messages";
import type {
  ActionResult,
  ConfigOrigin,
  ConfigurationStatusType,
  OfferStatusType,
  Role,
  SubRecordEntity,
} from "@/types";

// --- Generic Props Interface ---
interface SubRecordFormProps<
  TData extends FieldValues,
  TFormSchema extends z.ZodType<TData>,
> {
  parentId: number; // ID of the parent (e.g., confId)
  parentStatus: ConfigurationStatusType;
  parentOrigin?: ConfigOrigin;
  offerRevisionStatus?: OfferStatusType;
  userRole?: Role;
  schema: TFormSchema; // Zod schema for validation
  entityDefaults: TData; // Default values for new entity
  entityData?: TData & { id: number }; // Optional existing data (must have id)
  entity: SubRecordEntity; // Typed discriminator; label/gender in SUB_RECORD_ENTITY_META
  entityIndex?: number; // Optional index for titles
  onDelete?: (id: number) => void; // Callback after delete
  // Called when the add form is finished — created or cancelled — and should be
  // collapsed. Optional and passed only by the add-form instances; the edit
  // branch never fires it.
  onAddFormDone?: () => void;
  formKey?: string;
  onDirtyChange?: (key: string, isDirty: boolean) => void;
  onSaved?: (key: string) => void;
  onSubmitFailed?: (key: string) => void;
  // Server Actions
  insertAction: (parentId: number, values: TData) => Promise<ActionResult>;
  editAction: (
    parentId: number,
    id: number,
    values: TData,
  ) => Promise<ActionResult>;
  deleteAction: (parentId: number, id: number) => Promise<ActionResult>;
  hasEngineeringBom?: boolean;
  // The entity-specific fields, passed as an element slot. Fields components read
  // everything from useFormContext, so a plain ReactNode avoids manufacturing a
  // fresh component type per prop change (which would remount the whole subtree).
  fields: React.ReactNode;
}

const SubRecordForm = <
  TData extends FieldValues,
  TFormSchema extends z.ZodType<TData>,
>({
  parentId,
  parentStatus,
  parentOrigin,
  offerRevisionStatus,
  userRole,
  schema,
  entityDefaults,
  entityData,
  entity,
  entityIndex,
  onDelete,
  onAddFormDone,
  formKey,
  onDirtyChange,
  onSaved,
  onSubmitFailed,
  insertAction,
  editAction,
  deleteAction,
  hasEngineeringBom,
  fields,
}: SubRecordFormProps<TData, TFormSchema>) => {
  type FormData = TData;

  // Italian display label for this entity; the gender-aware Italian strings are
  // built from the typed `entity` key inside MSG.
  const entityLabel = SUB_RECORD_ENTITY_META[entity].label;

  // --- State & Form Hook ---
  const [isSubmitting, startSubmit] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const pendingValuesRef = useRef<FormData | null>(null);
  const pendingActionRef = useRef<"save" | "delete" | null>(null);

  const formIsDisabled =
    isSubmitting ||
    isDeleting ||
    isConfigLocked(parentStatus, userRole, parentOrigin, offerRevisionStatus);

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

  // --- Derived State ---
  const isEditing = !!entityData?.id;
  const isSaveOrCancelDisabled =
    formIsDisabled || (isEditing && !formState.isDirty);
  const isDeleteDisabled = formIsDisabled;

  // --- Event Handlers ---
  const executeSave = useCallback(
    (values: FormData) => {
      startSubmit(async () => {
        try {
          if (isEditing) {
            const result = await editAction(parentId, entityData.id, values);
            if (!result.success) {
              throw new Error(
                result.error || MSG.toast.entityUpdateFallback(entity),
              );
            }
            toast.success(MSG.toast.entityUpdated(entity, entityIndex));
            reset(values);
            if (formKey) {
              onSaved?.(formKey);
              onDirtyChange?.(formKey, false);
            }
          } else {
            const result = await insertAction(parentId, values);
            if (!result.success) {
              throw new Error(
                result.error || MSG.toast.entityCreateFallback(entity),
              );
            }
            toast.success(MSG.toast.entityCreated(entity));
            reset(entityDefaults);
            if (formKey) onSaved?.(formKey);
            onAddFormDone?.();
          }
        } catch (err) {
          console.error(`Save ${entityLabel} Error:`, err);
          const message =
            err instanceof Error
              ? err.message
              : MSG.toast.entitySaveUnknown(entity);
          toast.error(message);
          if (formKey) onSubmitFailed?.(formKey);
        }
      });
    },
    [
      isEditing,
      parentId,
      entityData,
      entityIndex,
      reset,
      onAddFormDone,
      editAction,
      insertAction,
      entityDefaults,
      entity,
      entityLabel,
      formKey,
      onSaved,
      onDirtyChange,
      onSubmitFailed,
    ],
  );

  const handleSaveSubmit = useCallback(
    (values: FormData) => {
      if (hasEngineeringBom) {
        pendingValuesRef.current = values;
        pendingActionRef.current = "save";
        setShowSaveWarning(true);
        return;
      }
      executeSave(values);
    },
    [hasEngineeringBom, executeSave],
  );

  const handleInvalid = useCallback(() => {
    toast.error(MSG.toast.validationErrors);
    if (formKey) onSubmitFailed?.(formKey);
  }, [formKey, onSubmitFailed]);

  const executeDelete = useCallback(() => {
    if (!isEditing || !onDelete) return;

    startDelete(async () => {
      try {
        const result = await deleteAction(parentId, entityData.id);
        if (result.success) {
          toast.success(MSG.toast.entityDeleted(entity, entityIndex));
          onDelete(entityData.id);
        } else {
          throw new Error(result.error || MSG.toast.entityDeleteFailed(entity));
        }
      } catch (err) {
        console.error(`Delete ${entityLabel} Error:`, err);
        const message =
          err instanceof Error
            ? err.message
            : MSG.toast.entityDeleteUnknown(entity);
        toast.error(message);
      }
    });
  }, [
    isEditing,
    parentId,
    entityData,
    entityIndex,
    onDelete,
    deleteAction,
    entity,
    entityLabel,
  ]);

  const handleDelete = useCallback(() => {
    if (!isEditing || !onDelete) return;
    setShowDeleteConfirm(true);
  }, [isEditing, onDelete]);

  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(false);
    if (hasEngineeringBom) {
      pendingActionRef.current = "delete";
      setShowSaveWarning(true);
      return;
    }
    executeDelete();
  }, [hasEngineeringBom, executeDelete]);

  const handleSaveWarningConfirm = useCallback(() => {
    setShowSaveWarning(false);
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
    if (formKey) onDirtyChange?.(formKey, false);
    // Collapse the add form when cancelling add mode
    if (!isEditing) {
      onAddFormDone?.();
    }
  }, [
    reset,
    entityData,
    entityDefaults,
    isEditing,
    onAddFormDone,
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
              onSubmit={handleSubmit(handleSaveSubmit, handleInvalid)}
            >
              <Fieldset
                title={
                  isEditing
                    ? MSG.subRecord.editTitle(entity, entityIndex)
                    : MSG.subRecord.addTitle(entity)
                }
              >
                {/* Render the specific fields (element slot) */}
                {fields}

                <div className="flex items-center gap-4 pt-4 border-t border-border mt-4 group-disabled:opacity-50">
                  {/* Delete Button */}
                  {isEditing && onDelete && (
                    <Button
                      className="ml-auto"
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleteDisabled}
                      aria-label={MSG.subRecord.deleteLabel(
                        entity,
                        entityIndex,
                      )}
                    >
                      {isDeleting ? (
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
                    isSubmitting={isSubmitting}
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
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={MSG.deleteConfirm.title}
        description={MSG.deleteConfirm.body(entityLabel, entityIndex)}
        onConfirm={handleDeleteConfirm}
        confirmText={MSG.deleteConfirm.confirm}
        confirmVariant="destructive"
        isConfirming={isDeleting}
      />
      <SaveWarningDialog
        open={showSaveWarning}
        onOpenChange={setShowSaveWarning}
        onCancel={() => {
          // The BOM warning is shared with the delete flow: only a cancelled
          // save settles a submit round, delete-cancel must not disarm.
          if (pendingActionRef.current === "save" && formKey) {
            onSubmitFailed?.(formKey);
          }
          pendingValuesRef.current = null;
          pendingActionRef.current = null;
        }}
        onConfirm={handleSaveWarningConfirm}
      />
    </div>
  );
};

export default SubRecordForm;

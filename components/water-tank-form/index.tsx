"use client";

import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// import { DevTool } from "@hookform/devtools"; // Keep commented out for production
import { RotateCcw, Save, Trash2 } from "lucide-react";
import WaterTankFields from "@/components/water-tank-form/water-tank-fields";
import {
  UpdateWaterTankSchema,
  waterTankDefaults,
  waterTankSchema,
  WaterTankSchema,
} from "@/validation/water-tank-schema";
import { insertWaterTankAction } from "@/app/actions/insert-water-tank-action";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { toast } from "sonner";
import { editWaterTankAction } from "@/app/actions/edit-water-tank-action";
import { deleteWaterTankAction } from "@/app/actions/delete-water-tank-action";
import Fieldset from "@/components/fieldset";

interface WaterTankFormProps {
  confId: number;
  waterTank?: UpdateWaterTankSchema;
  waterTankIndex?: number;
  onDelete?: (tankId: number) => void;
  onSaveSuccess: () => void;
}

const WaterTankForm = ({
  confId,
  waterTank,
  waterTankIndex,
  onDelete,
  onSaveSuccess,
}: WaterTankFormProps) => {
  const [isLoading, setIsLoading] = useState<"submit" | "delete" | false>(
    false
  );
  const [error, setError] = useState<string>("");

  const form = useForm<WaterTankSchema>({
    resolver: zodResolver(waterTankSchema),
    defaultValues: waterTank ?? waterTankDefaults,
  });

  const { handleSubmit, reset, formState, control } = form;

  const isEditing = !!waterTank?.id;
  // Disable Save/Update and Cancel if loading OR if editing and form isn't dirty
  const isSaveOrCancelDisabled =
    !!isLoading || (isEditing && !formState.isDirty);
  // Disable Delete if loading
  const isDeleteDisabled = !!isLoading;

  async function handleSaveSubmit(values: WaterTankSchema) {
    console.log("🚀 ~ onSubmit ~ values:", values); // DEBUG
    setIsLoading("submit");
    setError("");
    try {
      if (isEditing) {
        await editWaterTankAction(confId, waterTank.id, values);
        toast.success(`Serbatoio ${waterTankIndex} aggiornato.`);
        reset(values);
      } else {
        await insertWaterTankAction(confId, values);
        toast.success("Nuovo serbatoio creato.");
        reset(waterTankDefaults);
        onSaveSuccess();
      }
    } catch (err) {
      console.error("Save Water Tank Error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Un errore sconosciuto durante il salvataggio.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!isEditing || !onDelete) return;

    const confirmMessage = `Sei sicuro di voler eliminare il Serbatoio ${
      waterTankIndex ?? ""
    }?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLoading("delete");
    setError("");
    try {
      const result = await deleteWaterTankAction(confId, waterTank.id);
      if (result.success) {
        toast.success(`Serbatoio ${waterTankIndex} eliminato.`);
        onDelete(waterTank.id);
      } else {
        throw new Error(result.error || "Impossibile eliminare il serbatoio.");
      }
    } catch (err) {
      console.error("Delete Water Tank Error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during delete.";
      setError(message);
      toast.error(message);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset(waterTank ?? waterTankDefaults);

    // When adding a tank notify parent of cancel and hide form.
    if (!isEditing) {
      onSaveSuccess();
    }
  };

  return (
    <div>
      {/* <DevTool control={control} /> */}
      <Form {...form}>
        <fieldset disabled={!!isLoading} className="group">
          <form onSubmit={handleSubmit(handleSaveSubmit)}>
            <Fieldset
              title={
                isEditing
                  ? `Serbatoio ${waterTankIndex}`
                  : "Aggiungi Nuovo Serbatoio"
              }>
              <WaterTankFields />
              <div className="flex items-center gap-4 pt-4 border-t border-border mt-4 group-disabled:opacity-50">
                {/* Delete Button */}
                {isEditing && onDelete && (
                  <Button
                    className="ml-auto"
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleteDisabled}
                    aria-label={`Elimina Serbatoio ${waterTankIndex}`}>
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
                  disabled={isSaveOrCancelDisabled}>
                  <RotateCcw />
                  <span className="hidden sm:inline">Annulla</span>
                </Button>
                {/* Save/Add Button */}
                <Button
                  type="submit"
                  disabled={isSaveOrCancelDisabled}
                  className="gap-1.5 min-w-[100px] sm:min-w-[140px]">
                  {isLoading === "submit" ? (
                    <Spinner className="h-4 w-4 text-foreground" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isEditing ? "Salva" : "Aggiungi"}
                  </span>
                </Button>
              </div>
            </Fieldset>
          </form>
        </fieldset>
      </Form>
      {error && <p className="text-destructive mt-2">{error}</p>}{" "}
    </div>
  );
};

export default WaterTankForm;

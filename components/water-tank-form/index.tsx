"use client";

import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// import { DevTool } from "@hookform/devtools"; // Keep commented out for production
import { Save, Trash2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import WaterTankSection from "@/components/water-tank-form/water-tank-section";
import {
  waterTankSchema,
  WaterTankSchema,
} from "@/validation/water-tank-schema";
import { insertWaterTankAction } from "@/app/actions/insert-water-tank-action";

interface WaterTankFormProps {
  confId: number;
  waterTank?: WaterTankSchema & { tempId?: string };
  onRemove: () => void;
  isRemoving?: boolean;
}

const WaterTankForm = ({
  confId,
  waterTank,
  onRemove,
  isRemoving = false,
}: WaterTankFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const form = useForm<WaterTankSchema>({
    resolver: zodResolver(waterTankSchema),
    defaultValues: waterTank || {},
  });

  async function onSubmit(values: WaterTankSchema) {
    if (isRemoving) return;

    console.log("🚀 ~ onSubmit ~ values:", values); // DEBUG
    const dataToSave: WaterTankSchema & { configuration_id: number } = {
      type: values.type,
      inlet_w_float_qty: values.inlet_w_float_qty,
      inlet_no_float_qty: values.inlet_no_float_qty,
      outlet_w_valve_qty: values.outlet_w_valve_qty,
      outlet_no_valve_qty: values.outlet_no_valve_qty,
      has_blower: values.has_blower,
      configuration_id: confId, // Ensure configuration_id is included if needed by action/schema
      // Explicitly include id if it's part of the schema and you are updating
      id: waterTank?.id,
    };

    try {
      setIsSubmitting(true);
      setError("");
      // Pass the potentially cleaned 'dataToSave' object
      await insertWaterTankAction(confId, dataToSave);
      // Maybe reset form state or show success?
      setIsSubmitting(false);
    } catch (err) {
      console.log("🚀 ~ onSubmit ~ err:", err); // DEBUG
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during save.");
      }
      setIsSubmitting(false);
    }
  }

  // Prevent removal if save is in progress
  const handleRemoveClick = () => {
    if (isSubmitting) return;
    onRemove();
  };

  return (
    <div>
      {/* <DevTool control={form.control} /> */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <WaterTankSection />
          <div className="space-x-6 mt-4">
            <LoadingButton
              type="submit"
              variant="default"
              title="Salva serbatoio"
              loading={isSubmitting}
              // Disable if saving OR removing
              disabled={isSubmitting || isRemoving}
              size="icon">
              {!isSubmitting && <Save size={18} />}
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="destructive"
              title="Rimuovi serbatoio"
              size="icon"
              onClick={handleRemoveClick}
              loading={isRemoving}
              disabled={isSubmitting || isRemoving}>
              {!isRemoving && <Trash2 size={18} />}
            </LoadingButton>
          </div>
        </form>
      </Form>
      {error && <p className="text-destructive mt-2">{error}</p>}{" "}
    </div>
  );
};

export default WaterTankForm;

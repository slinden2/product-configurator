"use client";

import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { z } from "zod";
import { configSchema } from "@/validation/config-schema";
import { FieldErrors, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import GeneralSection from "@/components/config-form/general-section";
import BrushSection from "@/components/config-form/brush-section";
import ChemPumpSection from "@/components/config-form/chem-pump-section";
import SupplySection from "@/components/config-form/supply-section";
import WaterSupplySection from "@/components/config-form/water-supply-section";
import RailSection from "@/components/config-form/rail-section";
import TouchSection from "@/components/config-form/touch-section";
import HPPumpSection from "@/components/config-form/hp-pump-section";
import WaterTankSection from "@/components/config-form/water-tank-section";
import WashBaySection from "@/components/config-form/wash-bay-section";
import BackButton from "@/components/back-button";
import { redirectTo } from "@/app/actions/redirect-to";
import { DevTool } from "@hookform/devtools"; // TODO Remove dev tools
import { Save } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { editConfiguration } from "@/app/actions/edit-configuration";
import { isZodBoolean } from "@/lib/utils";
import { useRouter } from "next/navigation";

export type ConfigFormData = z.infer<typeof configSchema>;

interface ConfigurationFormProps {
  configuration?: ConfigFormData;
}

const ConfigForm = ({ configuration }: ConfigurationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: configuration,
  });

  async function onSubmit(values: ConfigFormData) {
    console.log("🚀 ~ onSubmit ~ values:", values);
    const { id } = values;
    try {
      setIsSubmitting(true);
      setError("");

      if (configuration?.id) {
        await editConfiguration(id, values);
      } else {
        // await fetch("/api/configurations", {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify(values),
        // });
      }
      setIsSubmitting(false);
      // router.push("/configurations");
    } catch (err) {
      console.log("🚀 ~ onSubmit ~ err:", err);
      if (err instanceof Error) {
        setError(err.message);
      }
      setIsSubmitting(false);
    }
  }

  // This is needed to convert empty string values to false or null depending on the field type.
  // For example, when chem pump checkbox is unchecked, it reset other field values to empty strings.
  // This causes the validation to throw an error, but this function fixes it and revalidates after conversion.
  async function onError(errors: FieldErrors<ConfigFormData>) {
    const formData = form.getValues();

    for (const key in errors) {
      if (Object.prototype.hasOwnProperty.call(errors, key)) {
        const typedKey = key as keyof ConfigFormData;
        const fieldSchema = configSchema.shape[typedKey];

        if (formData[typedKey] === "") {
          if (isZodBoolean(fieldSchema)) {
            form.setValue(typedKey, false);
            form.trigger(typedKey);
          } else {
            form.setValue(typedKey, null);
            form.trigger(typedKey);
          }
        }
      }
    }

    await onSubmit(form.getValues());
  }

  return (
    <div>
      {/* <DevTool control={form.control} /> */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)}>
          <GeneralSection />
          <BrushSection />
          <ChemPumpSection />
          <WaterSupplySection />
          <SupplySection />
          <RailSection />
          <TouchSection />
          <HPPumpSection />
          <WaterTankSection />
          <WashBaySection />
          <div className="space-x-6">
            <BackButton fallbackPath="/configurations" />
            <LoadingButton
              type="submit"
              variant="default"
              title="Salva configurazione"
              loading={isSubmitting}
              disabled={isSubmitting}
              size="icon">
              {!isSubmitting && <Save />}
            </LoadingButton>
          </div>
        </form>
      </Form>
      <p className="text-destructive">{error}</p>
    </div>
  );
};

export default ConfigForm;

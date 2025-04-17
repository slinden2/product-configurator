"use client";

import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import {
  ConfigSchema,
  configSchema,
  UpdateConfigSchema,
} from "@/validation/config-schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import GeneralSection from "@/components/config-form/general-section";
import BrushSection from "@/components/config-form/brush-section";
import ChemPumpSection from "@/components/config-form/chem-pump-section";
import SupplySection from "@/components/config-form/supply-section";
import WaterSupplySection from "@/components/config-form/water-supply-section";
import RailSection from "@/components/config-form/rail-section";
import TouchSection from "@/components/config-form/touch-section";
import HPPumpSection from "@/components/config-form/hp-pump-section";
import { DevTool } from "@hookform/devtools"; // TODO Remove dev tools
import { Save } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { editConfigurationAction } from "@/app/actions/edit-configuration-action";
import { useRouter } from "next/navigation";
import { insertConfigurationAction } from "@/app/actions/insert-configuration-action";

interface ConfigurationFormProps {
  id?: number;
  configuration?: UpdateConfigSchema;
}

const ConfigForm = ({ id, configuration }: ConfigurationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const form = useForm<UpdateConfigSchema>({
    resolver: zodResolver(configSchema),
    defaultValues: configuration,
  });

  async function onSubmit(values: ConfigSchema) {
    console.log("🚀 ~ onSubmit ~ values:", values);
    try {
      setIsSubmitting(true);
      setError("");

      if (id) {
        if (!configuration || !("user_id" in configuration)) {
          setError("Dati incompleti per l'aggiornamento.");
          setIsSubmitting(false);
          return;
        }
        await editConfigurationAction(id, configuration.user_id, values);
      } else {
        await insertConfigurationAction(values);
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

  return (
    <div>
      {/* <DevTool control={form.control} /> */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <GeneralSection />
          <BrushSection />
          <ChemPumpSection />
          <WaterSupplySection />
          <SupplySection />
          <RailSection />
          <TouchSection />
          <HPPumpSection />
          <div className="space-x-6">
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

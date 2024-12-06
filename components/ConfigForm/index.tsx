"use client";

import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { z } from "zod";
import { configSchema } from "@/validation/configSchema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import GeneralSection from "@/components/ConfigForm/GeneralSection";
import BrushSection from "@/components/ConfigForm/BrushSection";
import ChemPumpSection from "@/components/ConfigForm/ChemPumpSection";
import SupplySection from "@/components/ConfigForm/SupplySection";
import WaterSupplySection from "@/components/ConfigForm/WaterSupplySection";
import RailSection from "@/components/ConfigForm/RailSection";
import TouchSection from "@/components/ConfigForm/TouchSection";
import HPPumpSection from "@/components/ConfigForm/HPPumpSection";
import WaterTankSection from "@/components/ConfigForm/WaterTankSection";
import WashBaySection from "@/components/ConfigForm/WashBaySection";
import BackButton from "@/components/BackButton";
import { redirectTo } from "@/app/actions";
import { DevTool } from "@hookform/devtools"; // TODO Remove dev tools
import { Save } from "lucide-react";

export type ConfigFormData = z.infer<typeof configSchema>;

interface ConfigurationFormProps {
  configuration?: ConfigFormData;
}

const ConfigForm = ({ configuration }: ConfigurationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: configuration,
  });

  async function onSubmit(values: ConfigFormData) {
    console.log("🚀 ~ onSubmit ~ values:", values);
    try {
      setIsSubmitting(true);
      setError("");

      if (configuration?.id) {
        await fetch("/api/configurations/" + configuration.id, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });
      } else {
        await fetch("/api/configurations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });
      }
      setIsSubmitting(false);
      await redirectTo("/configurations");
    } catch (err) {
      console.log("🚀 ~ onSubmit ~ err:", err);
      setError("Unknown error occured.");
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
          <WaterTankSection />
          <WashBaySection />
          <div className="space-x-6">
            <BackButton fallbackPath="/configurations" />
            <Button
              type="submit"
              disabled={isSubmitting}
              size="icon"
              variant="default"
              title="Salva configurazione">
              <Save />
            </Button>
          </div>
        </form>
      </Form>
      <p className="text-destructive">{error}</p>
    </div>
  );
};

export default ConfigForm;

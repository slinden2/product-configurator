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
import PanelSection from "@/components/ConfigForm/PanelSection";
import HPPumpSection from "@/components/ConfigForm/HPPumpSection";
import { DevTool } from "@hookform/devtools";
import WaterTankSection from "@/components/ConfigForm/WaterTankSection";
import WashBaySection from "@/components/ConfigForm/WashBaySection";
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
    try {
      setIsSubmitting(true);
      setError("");

      await fetch("/api/configurations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      setIsSubmitting(false);
      router.push("/configurations");
      router.refresh();
    } catch (err) {
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
          <PanelSection />
          <HPPumpSection />
          <WaterTankSection />
          <WashBaySection />
          <Button type="submit" disabled={isSubmitting}>
            Salva
          </Button>
        </form>
      </Form>
      <p className="text-destructive">{error}</p>
    </div>
  );
};

export default ConfigForm;

"use client";

import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import {
  configDefaults,
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
import { DevTool } from "@hookform/devtools"; // DEBUG
import { Save } from "lucide-react";
import { editConfigurationAction } from "@/app/actions/edit-configuration-action";
import { insertConfigurationAction } from "@/app/actions/insert-configuration-action";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfigurationStatusType } from "@/types";

interface ConfigurationFormProps {
  id?: number;
  configuration?: UpdateConfigSchema;
  status?: ConfigurationStatusType;
}

const ConfigForm = ({ id, configuration, status }: ConfigurationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const formIsDisabled = isSubmitting || status === "LOCKED" || status === "CLOSED";

  const form = useForm<UpdateConfigSchema>({
    resolver: zodResolver(configSchema),
    defaultValues: configuration ?? configDefaults,
    disabled: formIsDisabled,
  });

  async function onSubmit(values: ConfigSchema) {
    console.log("🚀 ~ onSubmit ~ values:", values); // DEBUG
    try {
      setIsSubmitting(true);
      setError("");

      if (id) {
        if (!configuration || !("user_id" in configuration)) {
          setError("Dati incompleti per l'aggiornamento.");
          toast.error("Dati incompleti per l'aggiornamento.");
          setIsSubmitting(false);
          return;
        }
        await editConfigurationAction(id, configuration.user_id, values);
        toast.success("Configurazione aggiornata.");
      } else {
        const { id } = await insertConfigurationAction(values);
        toast.success("Configurazione creata.");
        router.push(`/configurations/edit/${id}`);
      }
      setIsSubmitting(false);
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
      {/* DEBUG */}
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
          <div className="flex gap-4">
            <Button
              className="ml-auto"
              variant="destructive"
              onClick={() => form.reset({})}>
              Annulla
            </Button>
            <Button className="flex items-center gap-2" type="submit">
              {isSubmitting ? (
                <Spinner className="h-4 w-4 text-foreground" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Salva configurazione</span>
            </Button>
          </div>
        </form>
      </Form>
      <p className="text-destructive">{error}</p>
    </div>
  );
};

export default ConfigForm;

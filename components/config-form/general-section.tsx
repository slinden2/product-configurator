"use client";

import { useFormContext, useWatch } from "react-hook-form";
import Fieldset from "@/components/fieldset";
import InputField from "@/components/input-field";
import SelectField from "@/components/select-field";
import TextareaField from "@/components/textarea-field";
import { FormItem, FormLabel } from "@/components/ui/form";
import { WASH_HEIGHT_OFFSET_MM } from "@/types";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions } from "@/validation/configuration";

const GeneralSection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const totalHeight = useWatch<ConfigSchema>({ control, name: "total_height" });
  const totalNumber = Number(totalHeight);
  const washHeightDisplay =
    Number.isFinite(totalNumber) && totalNumber > WASH_HEIGHT_OFFSET_MM
      ? `${totalNumber - WASH_HEIGHT_OFFSET_MM} mm`
      : "—";

  return (
    <Fieldset
      title="Informazioni generali"
      description="Compila i dati del cliente e la descrizione dell'impianto"
    >
      <div className="fs-content">
        <InputField<ConfigSchema>
          name="name"
          label="Nome del cliente"
          placeholder="Inserire il nome del cliente"
        />
        <TextareaField<ConfigSchema>
          name="description"
          label="Descrizione"
          placeholder="Inserire la descrizione"
        />
        <SelectField<ConfigSchema>
          name="machine_type"
          label="Tipo impianto"
          items={selectFieldOptions.machineTypeOpts}
          dataType="string"
        />
        <div className="fs-row">
          <div className="fs-item">
            <InputField<ConfigSchema>
              name="total_height"
              type="number"
              label="Altezza totale"
              suffix="mm"
            />
          </div>
          <div className="fs-item">
            <FormItem>
              <FormLabel>Altezza di lavaggio</FormLabel>
              <p className="flex h-9 items-center text-sm text-muted-foreground">
                {washHeightDisplay}
              </p>
            </FormItem>
          </div>
        </div>
      </div>
    </Fieldset>
  );
};

export default GeneralSection;

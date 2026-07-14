"use client";

import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import InputField from "@/components/input-field";
import SelectField from "@/components/select-field";
import TextareaField from "@/components/textarea-field";
import { FormItem, FormLabel } from "@/components/ui/form";
import {
  getWashHeightMm,
  isOmzMachine,
} from "@/lib/configuration/display-rules";
import {
  CONFIG_FIELD_LABELS,
  DERIVED_FIELD_LABELS,
} from "@/lib/configuration/field-labels";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions } from "@/validation/configuration";

const GeneralSection = ({
  showClientName = true,
  clientName,
}: {
  showClientName?: boolean;
  clientName?: string;
}) => {
  const { control } = useFormContext<ConfigSchema>();
  const totalHeight = useWatch({ control, name: "total_height" });
  const machineType = useWatch({ control, name: "machine_type" });
  const isOMZ = isOmzMachine({ machine_type: machineType });

  const washHeightMm = getWashHeightMm(totalHeight);
  const washHeightDisplay = washHeightMm !== null ? `${washHeightMm} mm` : "—";

  return (
    <Fieldset
      title="Informazioni generali"
      description={
        showClientName
          ? "Compila i dati del cliente e la descrizione dell'impianto"
          : "Compila la descrizione dell'impianto"
      }
    >
      <div className="fs-content">
        {showClientName && (
          <InputField<ConfigSchema>
            name="name"
            label={CONFIG_FIELD_LABELS.name}
            placeholder="Inserire il nome del cliente"
          />
        )}
        {!showClientName && (
          <FormItem>
            <FormLabel>{CONFIG_FIELD_LABELS.name}</FormLabel>
            <p className="flex h-9 items-center text-sm">{clientName ?? "—"}</p>
          </FormItem>
        )}
        <TextareaField<ConfigSchema>
          name="description"
          label={CONFIG_FIELD_LABELS.description}
          placeholder="Inserire la descrizione"
        />
        <SelectField<ConfigSchema>
          name="machine_type"
          label={CONFIG_FIELD_LABELS.machine_type}
          items={selectFieldOptions.machineTypeOpts}
          dataType="string"
          fieldsToResetOnValue={[
            {
              triggerValue: "OMZ",
              invertTrigger: true,
              fieldsToReset: ["has_omz_paint"],
              resetToValue: false,
            },
          ]}
        />
        {isOMZ && (
          <CheckboxField<ConfigSchema>
            name="has_omz_paint"
            label={CONFIG_FIELD_LABELS.has_omz_paint}
          />
        )}
        <div className="fs-row">
          <div className="fs-item">
            <InputField<ConfigSchema>
              name="total_height"
              type="number"
              label={CONFIG_FIELD_LABELS.total_height}
              suffix="mm"
            />
          </div>
          <div className="fs-item">
            <FormItem>
              <FormLabel>{DERIVED_FIELD_LABELS.wash_height}</FormLabel>
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

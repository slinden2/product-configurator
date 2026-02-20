import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

const BrushSection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const brushNumWatch = useWatch<ConfigSchema>({ control, name: "brush_qty" });
  const isDisabled = brushNumWatch === undefined || brushNumWatch === 0;

  console.log('brushNumWatch :>> ', brushNumWatch);

  return (
    <Fieldset
      title="Spazzole"
      description="Compila i dati relativi alle spazzole"
    >
      <FieldsetContent>
        <FieldsetRow>
          <FieldsetItem>
            <SelectField<ConfigSchema>
              name="brush_qty"
              dataType="number"
              label="Numero di spazzole"
              items={selectFieldOptions.brushNums}
              fieldsToResetOnValue={[
                {
                  triggerValue: 0,
                  fieldsToReset: ["brush_type", "brush_color", "has_shampoo_pump"],
                },
                {
                  triggerValue: 2,
                  fieldsToReset: ["has_acid_pump", "acid_pump_pos", "has_omz_pump", "pump_outlet_omz"],
                }
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="brush_type"
              dataType="string"
              label="Tipo di setole"
              disabled={isDisabled}
              items={selectFieldOptions.brushTypes}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="brush_color"
              dataType="string"
              label="Colore di setole"
              disabled={isDisabled}
              items={selectFieldOptions.brushColors}
            />
          </FieldsetItem>
        </FieldsetRow>
      </FieldsetContent>
    </Fieldset>
  );
};

export default BrushSection;

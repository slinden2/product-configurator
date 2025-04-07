import { ConfigFormData } from "@/components/config-form";
import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";
import { useWatch } from "react-hook-form";

const BrushSection = () => {
  const brushNumWatch = useWatch<ConfigFormData>({ name: "brush_qty" });

  return (
    <Fieldset title="Spazzole">
      <FieldsetContent>
        <FieldsetRow>
          <FieldsetItem>
            <SelectField
              name="brush_qty"
              label="Numero di spazzole"
              items={selectFieldOptions.brushNums}
              fieldsToResetOnValue={[
                {
                  triggerValue: "0",
                  fieldsToReset: ["brush_type", "brush_color"],
                },
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="brush_type"
              label="Tipo di setole"
              disabled={!brushNumWatch || brushNumWatch === "0"}
              items={selectFieldOptions.brushTypes}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="brush_color"
              label="Colore di setole"
              disabled={!brushNumWatch || brushNumWatch === "0"}
              items={selectFieldOptions.brushColors}
            />
          </FieldsetItem>
        </FieldsetRow>
      </FieldsetContent>
    </Fieldset>
  );
};

export default BrushSection;

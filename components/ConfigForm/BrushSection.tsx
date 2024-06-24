import FormSection from "@/components/FormSection";
import SelectField from "@/components/SelectField";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";
import { useWatch } from "react-hook-form";

const BrushSection = () => {
  const brushNumWatch = useWatch({ name: "brush_num" });

  return (
    <FormSection title="Spazzole">
      <div className="md:flex md:justify-between md:gap-4 space-y-3 md:space-y-0">
        <div className="md:flex-1">
          <SelectField
            name="brush_num"
            label="Numero di spazzole"
            items={selectFieldOptions.brushNums}
            fieldsToResetOnValue={[
              {
                triggerValue: "0",
                fieldsToReset: ["brush_type", "brush_color"],
              },
            ]}
          />
        </div>
        <div className="md:flex-1">
          <SelectField
            name="brush_type"
            label="Tipo di setole"
            disabled={!brushNumWatch || brushNumWatch === "0"}
            items={selectFieldOptions.brushTypes}
          />
        </div>
        <div className="md:flex-1">
          <SelectField
            name="brush_color"
            label="Colore di setole"
            disabled={!brushNumWatch || brushNumWatch === "0"}
            items={selectFieldOptions.brushColors}
          />
        </div>
      </div>
    </FormSection>
  );
};

export default BrushSection;

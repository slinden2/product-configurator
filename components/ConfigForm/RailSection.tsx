import FormSection from "@/components/FormSection";
import InputField from "@/components/InputField";
import SelectField from "@/components/SelectField";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";

const RailSection = () => {
  return (
    <FormSection title="Rotaie">
      <div className="space-y-2 md:flex md:space-y-0 md:gap-4">
        <div className="md:flex-1">
          <SelectField
            name="rail_type"
            label="Tipo di rotaie"
            items={selectFieldOptions.railTypes}
          />
        </div>
        <div className="md:flex-1">
          <InputField
            name="rail_length"
            label="Lunghezza rotaie"
            placeholder="Inserire lunghezza (7-26m)"
          />
        </div>
        <div className="md:flex-1">
          <SelectField
            name="rail_guide_num"
            label="Guida ruote"
            items={selectFieldOptions.railGuideNum}
          />
        </div>
      </div>
    </FormSection>
  );
};

export default RailSection;

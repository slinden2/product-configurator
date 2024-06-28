import Fieldset from "@/components/Fieldset";
import FieldsetContent from "@/components/FieldsetContent";
import FieldsetItem from "@/components/FieldsetItem";
import FieldsetRow from "@/components/FieldsetRow";
import InputField from "@/components/InputField";
import SelectField from "@/components/SelectField";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";

const RailSection = () => {
  return (
    <Fieldset title="Rotaie">
      <FieldsetContent>
        <FieldsetRow>
          <FieldsetItem>
            <SelectField
              name="rail_type"
              label="Tipo di rotaie"
              items={selectFieldOptions.railTypes}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="rail_length"
              label="Lunghezza rotaie"
              items={selectFieldOptions.railLengths}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="rail_guide_num"
              label="Guida ruote"
              items={selectFieldOptions.railGuideNum}
            />
          </FieldsetItem>
        </FieldsetRow>
      </FieldsetContent>
    </Fieldset>
  );
};

export default RailSection;

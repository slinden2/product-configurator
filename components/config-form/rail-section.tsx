import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";

const RailSection = () => {
  return (
    <Fieldset
      title="Rotaie"
      description="Configurare la tipologia e la lunghezza delle rotaie">
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
              name="rail_guide_qty"
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

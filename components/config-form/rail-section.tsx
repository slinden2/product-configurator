import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";

const RailSection = () => {
  return (
    <Fieldset
      title="Rotaie"
      description="Configurare la tipologia e la lunghezza delle rotaie">
      <div className="fs-content">
        <div className="fs-row">
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="rail_type"
              dataType="string"
              label="Tipo di rotaie"
              items={selectFieldOptions.railTypes}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="rail_length"
              dataType="number"
              label="Lunghezza rotaie"
              items={selectFieldOptions.railLengths}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="rail_guide_qty"
              dataType="number"
              label="Guida ruote"
              items={selectFieldOptions.railGuideNum}
            />
          </div>
        </div>
      </div>
    </Fieldset>
  );
};

export default RailSection;

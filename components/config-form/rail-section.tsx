"use client";

import { useFormContext, useWatch } from "react-hook-form";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import { isAnchoredRail } from "@/lib/configuration/display-rules";
import { CONFIG_FIELD_LABELS } from "@/lib/configuration/field-labels";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";

const RailSection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const railType = useWatch({ control, name: "rail_type" });
  const showAnchorType = isAnchoredRail({ rail_type: railType });

  return (
    <Fieldset
      title="Rotaie"
      description="Configurare la tipologia e la lunghezza delle rotaie"
    >
      <div className="fs-content">
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          <div className="space-y-3 md:col-start-1 md:row-start-1">
            <SelectField<ConfigSchema>
              name="rail_type"
              dataType="string"
              label={CONFIG_FIELD_LABELS.rail_type}
              items={selectFieldOptions.railTypes}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.RailTypeEnum.enum.ANCHORED,
                  fieldsToReset: ["anchor_type"],
                  invertTrigger: true,
                },
              ]}
            />
          </div>
          {showAnchorType && (
            <div className="space-y-3 md:col-start-1 md:row-start-2">
              <SelectField<ConfigSchema>
                name="anchor_type"
                dataType="string"
                label={CONFIG_FIELD_LABELS.anchor_type}
                items={selectFieldOptions.anchorTypes}
              />
            </div>
          )}
          <div className="space-y-3 md:col-start-2 md:row-start-1">
            <SelectField<ConfigSchema>
              name="rail_length"
              dataType="number"
              label={CONFIG_FIELD_LABELS.rail_length}
              items={selectFieldOptions.railLengths}
            />
          </div>
          <div className="space-y-3 md:col-start-3 md:row-start-1">
            <SelectField<ConfigSchema>
              name="rail_guide_qty"
              dataType="number"
              label={CONFIG_FIELD_LABELS.rail_guide_qty}
              items={selectFieldOptions.railGuideNum}
            />
          </div>
        </div>
      </div>
    </Fieldset>
  );
};

export default RailSection;

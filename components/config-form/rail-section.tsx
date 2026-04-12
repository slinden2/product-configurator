import { useWatch } from "react-hook-form";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";

const RailSection = () => {
  const railType = useWatch<ConfigSchema, "rail_type">({ name: "rail_type" });

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
              label="Tipo di rotaie"
              items={selectFieldOptions.railTypes}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.RailTypeEnum.enum.ANCHORED,
                  fieldsToReset: ["anchor_type"],
                  invertTrigger: true,
                  resetToValue: undefined,
                },
              ]}
            />
          </div>
          {railType === zodEnums.RailTypeEnum.enum.ANCHORED && (
            <div className="space-y-3 md:col-start-1 md:row-start-2">
              <SelectField<ConfigSchema>
                name="anchor_type"
                dataType="string"
                label="Tipo di tassello"
                items={selectFieldOptions.anchorTypes}
              />
            </div>
          )}
          <div className="space-y-3 md:col-start-2 md:row-start-1">
            <SelectField<ConfigSchema>
              name="rail_length"
              dataType="number"
              label="Lunghezza rotaie"
              items={selectFieldOptions.railLengths}
            />
          </div>
          <div className="space-y-3 md:col-start-3 md:row-start-1">
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

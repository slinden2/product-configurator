import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import InfoBanner from "@/components/shared/info-banner";
import {
  showEnergyChainWallWarning,
  showPostFrame as showPostFrameRule,
} from "@/lib/configuration/display-rules";
import { CONFIG_FIELD_LABELS } from "@/lib/configuration/field-labels";
import { MSG } from "@/lib/messages";
import { withNoSelection } from "@/lib/utils";
import type { ConfigSchema } from "@/validation/config-schema";
import {
  getSupplyFixingOptions,
  selectFieldOptions,
  zodEnums,
} from "@/validation/configuration";

const SupplySection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const supplyTypeWatch = useWatch({ control, name: "supply_type" });
  const supplyFixingTypeWatch = useWatch({
    control,
    name: "supply_fixing_type",
  });

  const showPostFrame = showPostFrameRule({
    supply_type: supplyTypeWatch,
    supply_fixing_type: supplyFixingTypeWatch,
  });

  const showEcWallWarning = showEnergyChainWallWarning({
    supply_type: supplyTypeWatch,
    supply_fixing_type: supplyFixingTypeWatch,
  });

  return (
    <Fieldset
      title="Alimentazione portale"
      description="Configura le impostazioni per la tipologia di alimentazione del portale e il lato"
    >
      <div className="fs-content">
        <div className="fs-row">
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="supply_type"
              dataType="string"
              label={CONFIG_FIELD_LABELS.supply_type}
              description={
                supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.ENERGY_CHAIN
                  ? "I dettagli relativi alla catena portacavi sono configurabili nel menù delle piste"
                  : undefined
              }
              items={selectFieldOptions.supplyTypes}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.SupplyTypeEnum.enum.BOOM,
                  fieldsToReset: ["has_post_frame"],
                  invertTrigger: true,
                  resetToValue: false,
                },
              ]}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="supply_fixing_type"
              dataType="string"
              label={CONFIG_FIELD_LABELS.supply_fixing_type}
              items={
                supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.STRAIGHT_SHELF
                  ? withNoSelection(getSupplyFixingOptions(supplyTypeWatch))
                  : getSupplyFixingOptions(supplyTypeWatch)
              }
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.SupplyFixingTypeEnum.enum.POST,
                  fieldsToReset: ["has_post_frame"],
                  invertTrigger: true,
                },
              ]}
            />
            {showEcWallWarning && (
              <InfoBanner variant="warning">
                {MSG.energyChainWall.supplySection}
              </InfoBanner>
            )}
            {showPostFrame && (
              <CheckboxField<ConfigSchema>
                name="has_post_frame"
                label={CONFIG_FIELD_LABELS.has_post_frame}
              />
            )}
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="supply_side"
              dataType="string"
              label={CONFIG_FIELD_LABELS.supply_side}
              items={selectFieldOptions.supplySides}
            />
          </div>
        </div>
      </div>
    </Fieldset>
  );
};

export default SupplySection;

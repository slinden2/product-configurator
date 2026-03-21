import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import { withNoSelection } from "@/lib/utils";
import { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

const SupplySection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const supplyTypeWatch = useWatch({ control, name: "supply_type" });
  const supplyFixingTypeWatch = useWatch({
    control,
    name: "supply_fixing_type",
  });

  const showPostFrame =
    (supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.BOOM ||
      supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.STRAIGHT_SHELF) &&
    supplyFixingTypeWatch === zodEnums.SupplyFixingTypeEnum.enum.POST;

  return (
    <Fieldset
      title="Alimentazione portale"
      description="Configura le impostazioni per la tipologia di alimentazione del portale e il lato">
      <div className="fs-content">
        <div className="fs-row">
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="supply_type"
              dataType="string"
              label="Tipo di alimentazione"
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
              label="Tipo di fissaggio"
              items={
                supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.STRAIGHT_SHELF
                  ? withNoSelection(selectFieldOptions.supplyFixingTypes)
                  : selectFieldOptions.supplyFixingTypes
              }
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.SupplyFixingTypeEnum.enum.POST,
                  fieldsToReset: ["has_post_frame"],
                  invertTrigger: true,
                },
              ]}
            />
            {showPostFrame && (
              <CheckboxField<ConfigSchema>
                name="has_post_frame"
                label="Con telaio e coperchio"
              />
            )}
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="supply_side"
              dataType="string"
              label="Lato di alimentazione"
              items={selectFieldOptions.supplySides}
            />
          </div>
        </div>
      </div>
    </Fieldset>
  );
};

export default SupplySection;

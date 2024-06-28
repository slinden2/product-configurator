import CheckboxField from "@/components/CheckboxField";
import Fieldset from "@/components/Fieldset";
import FieldsetContent from "@/components/FieldsetContent";
import FieldsetItem from "@/components/FieldsetItem";
import FieldsetRow from "@/components/FieldsetRow";
import SelectField from "@/components/SelectField";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useWatch } from "react-hook-form";

const SupplySection = () => {
  const supplyTypeWatch = useWatch({ name: "supply_type" });
  const supplyFixingTypeWatch = useWatch({ name: "supply_fixing_type" });

  return (
    <Fieldset title="Alimentazione portale">
      <FieldsetContent>
        <FieldsetRow>
          <FieldsetItem>
            <SelectField
              name="supply_type"
              label="Tipo di alimentazione"
              items={selectFieldOptions.supplyTypes}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.SupplyTypeEnum.enum.BOOM,
                  fieldsToReset: ["has_post_frame"],
                  invertTrigger: true,
                },
                {
                  triggerValue: zodEnums.SupplyTypeEnum.enum.CABLE_CHAIN,
                  fieldsToReset: ["cable_chain_width"],
                  invertTrigger: true,
                },
              ]}
            />
            {supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.CABLE_CHAIN && (
              <SelectField
                name="cable_chain_width"
                label="Larghezza catena"
                items={selectFieldOptions.cableChainWidths}
              />
            )}
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="supply_fixing_type"
              label="Tipo di fissaggio"
              items={selectFieldOptions.supplyFixingTypes}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.SupplyFixingTypeEnum.enum.POST,
                  fieldsToReset: ["has_post_frame"],
                  invertTrigger: true,
                },
              ]}
            />
            {supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.BOOM &&
              supplyFixingTypeWatch ===
                zodEnums.SupplyFixingTypeEnum.enum.POST && (
                <CheckboxField
                  name="has_post_frame"
                  label="Con telaio e coperchio"
                />
              )}
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="supply_side"
              label="Lato di alimentazione"
              items={selectFieldOptions.supplySides}
            />
          </FieldsetItem>
        </FieldsetRow>
      </FieldsetContent>
    </Fieldset>
  );
};

export default SupplySection;

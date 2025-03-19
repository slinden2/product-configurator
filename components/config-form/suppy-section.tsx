import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { withNoSelection } from "@/lib/utils";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useWatch } from "react-hook-form";

const SupplySection = () => {
  const supplyTypeWatch = useWatch({ name: "supply_type" });
  const supplyFixingTypeWatch = useWatch({ name: "supply_fixing_type" });
  const showPostFrame =
    (supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.BOOM ||
      supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.STRAIGHT_SHELF) &&
    supplyFixingTypeWatch === zodEnums.SupplyFixingTypeEnum.enum.POST;

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
                  fieldsToReset: ["energy_chain_width"],
                  invertTrigger: true,
                },
                {
                  triggerValue: zodEnums.SupplyTypeEnum.enum.STRAIGHT_SHELF,
                  fieldsToReset: ["supply_fixing_type"],
                  invertTrigger: false,
                },
              ]}
            />
            {supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.CABLE_CHAIN && (
              <SelectField
                name="energy_chain_width"
                label="Larghezza catena"
                items={selectFieldOptions.cableChainWidths}
              />
            )}
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="supply_fixing_type"
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

import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { NOT_SELECTED_VALUE, withNoSelection } from "@/lib/utils";
import { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

const WaterSupplySection = () => {
  const { control } = useFormContext<ConfigSchema>();

  // Watch relevant fields
  const water1PumpWatch = useWatch({ control, name: "water_1_pump" });
  const water2TypeWatch = useWatch({ control, name: "water_2_type" });

  // Determine if an inverter pump is selected for water 1
  const isInvPump1Selected =
    water1PumpWatch === zodEnums.WaterPump1Enum.enum.INV_3KW_200L ||
    water1PumpWatch === zodEnums.WaterPump1Enum.enum.INV_3KW_250L;

  // Determine if water pump 2 should be disabled (if type 2 is not selected/undefined)
  const isWater2PumpDisabled = water2TypeWatch === undefined; // Simplified check
  return (
    <Fieldset
      title="Alimentazione acqua"
      description="Configura le impostazioni per l'alimentazione dell'acqua e le pompe di rilancio"
    >
      <FieldsetContent>
        <FieldsetRow className="md:items-start">
          <FieldsetItem>
            <div className="space-y-3">
              <SelectField<ConfigSchema>
                name="water_1_type"
                dataType="string"
                label="Tipo acqua 1"
                items={withNoSelection(selectFieldOptions.waterTypes)}
              />
              <SelectField<ConfigSchema>
                name="water_1_pump"
                dataType="string"
                label="Pompa di rilancio"
                items={withNoSelection(selectFieldOptions.waterPump1Opts)}
                fieldsToResetOnValue={[
                  {
                    triggerValue: [
                      NOT_SELECTED_VALUE,
                      zodEnums.WaterPump1Enum.enum["BOOST_15KW"],
                      zodEnums.WaterPump1Enum.enum["BOOST_22KW"],
                    ],
                    fieldsToReset: [
                      "inv_pump_outlet_dosatron_qty",
                      "inv_pump_outlet_pw_qty",
                    ],
                  },
                ]}
              />
            </div>
          </FieldsetItem>
          {isInvPump1Selected && (
            <FieldsetItem>
              <>
                <SelectField<ConfigSchema>
                  name="inv_pump_outlet_dosatron_qty"
                  dataType="number"
                  label="Uscite Dosatron"
                  items={selectFieldOptions.inverterPumpOutletOpts}
                />
                <SelectField<ConfigSchema>
                  name="inv_pump_outlet_pw_qty"
                  dataType="number"
                  label="Uscite idropulitrice"
                  items={selectFieldOptions.inverterPumpOutletOpts}
                />
              </>
            </FieldsetItem>
          )}
          <FieldsetItem>
            <div className="space-y-3">
              <SelectField<ConfigSchema>
                name="water_2_type"
                dataType="string"
                label="Tipo acqua 2"
                items={withNoSelection(selectFieldOptions.waterTypes)}
                fieldsToResetOnValue={[
                  {
                    triggerValue: NOT_SELECTED_VALUE,
                    fieldsToReset: ["water_2_pump"],
                  },
                ]}
              />
              <SelectField<ConfigSchema>
                name="water_2_pump"
                dataType="string"
                label="Pompa di rilancio"
                disabled={isWater2PumpDisabled}
                items={withNoSelection(selectFieldOptions.waterPump2Opts)}
              />
            </div>
          </FieldsetItem>
          {!isInvPump1Selected && <FieldsetItem />}
        </FieldsetRow>
        <div className="">
          <CheckboxField name="has_antifreeze" label="Scarico invernale" />
        </div>
      </FieldsetContent>
    </Fieldset>
  );
};

export default WaterSupplySection;

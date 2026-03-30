import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import { NOT_SELECTED_VALUE, withNoSelection } from "@/lib/utils";
import { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

const WaterSupplySection = () => {
  const { control } = useFormContext<ConfigSchema>();

  // Watch relevant fields
  const water1TypeWatch = useWatch({ control, name: "water_1_type" });
  const water1PumpWatch = useWatch({ control, name: "water_1_pump" });
  const water2TypeWatch = useWatch({ control, name: "water_2_type" });

  // Determine if an inverter pump is selected for water 1
  const isInvPump1Selected =
    water1PumpWatch === zodEnums.WaterPump1Enum.enum.INV_3KW_200L ||
    water1PumpWatch === zodEnums.WaterPump1Enum.enum.INV_3KW_250L;

  // Determine if pumps should be disabled (if their water type is not selected)
  const isWater1PumpDisabled = water1TypeWatch === undefined;
  const isWater2PumpDisabled = water2TypeWatch === undefined;
  return (
    <Fieldset
      title="Alimentazione acqua"
      description="Configura le impostazioni per l'alimentazione dell'acqua e le pompe di rilancio"
    >
      <div className="fs-content">
        <div className="fs-row">
          <div className="fs-item">
            <div className="space-y-3 md:flex md:flex-col md:justify-between md:h-full">
              <SelectField<ConfigSchema>
                name="water_1_type"
                dataType="string"
                label="Tipo acqua 1"
                description="Gruppo EV acqua generale per locale tecnico"
                items={withNoSelection(selectFieldOptions.waterTypes)}
                fieldsToResetOnValue={[
                  {
                    triggerValue: NOT_SELECTED_VALUE,
                    fieldsToReset: ["water_1_pump"],
                  },
                  {
                    triggerValue: NOT_SELECTED_VALUE,
                    fieldsToReset: [
                      "inv_pump_outlet_dosatron_qty",
                      "inv_pump_outlet_pw_qty",
                    ],
                    resetToValue: 0,
                  },
                ]}
              />
              <SelectField<ConfigSchema>
                name="water_1_pump"
                dataType="string"
                label="Pompa di rilancio"
                disabled={isWater1PumpDisabled}
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
          </div>
          {isInvPump1Selected && (
            <div className="fs-item">
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
            </div>
          )}
          <div className="fs-item">
            <div className="space-y-3 md:flex md:flex-col md:justify-between md:h-full">
              <SelectField<ConfigSchema>
                name="water_2_type"
                dataType="string"
                label="Tipo acqua 2"
                description="Gruppo EV acqua per doppia alimentazione"
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
          </div>
          {!isInvPump1Selected && <div className="fs-item" />}
        </div>
        <div className="">
          <CheckboxField<ConfigSchema> name="has_antifreeze" label="Scarico invernale" />
        </div>
      </div>
    </Fieldset>
  );
};

export default WaterSupplySection;

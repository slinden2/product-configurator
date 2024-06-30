import CheckboxField from "@/components/CheckboxField";
import Fieldset from "@/components/Fieldset";
import FieldsetContent from "@/components/FieldsetContent";
import FieldsetItem from "@/components/FieldsetItem";
import FieldsetRow from "@/components/FieldsetRow";
import SelectField from "@/components/SelectField";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useWatch } from "react-hook-form";

const WaterSupplySection = () => {
  const waterType2Watch = useWatch({ name: "water_2_type" });
  const waterPump1Watch = useWatch({ name: "water_1_pump" });
  const hasInvPump = waterPump1Watch?.startsWith("INV_3KW");

  return (
    <Fieldset title="Alimentazione acqua">
      <FieldsetContent>
        <FieldsetRow className="md:items-start">
          <FieldsetItem>
            <div className="space-y-3">
              <SelectField
                name="water_1_type"
                label="Tipo acqua 1"
                items={selectFieldOptions.waterTypes1}
              />
              <SelectField
                name="water_1_pump"
                label="Pompa di rilancio"
                items={selectFieldOptions.waterPump1Opts}
                fieldsToResetOnValue={[
                  {
                    triggerValue: [
                      zodEnums.WaterPump1Enum.enum.NO_SELECTION,
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
          {hasInvPump && (
            <FieldsetItem>
              <>
                <SelectField
                  name="inv_pump_outlet_dosatron_qty"
                  label="Uscite Dosatron"
                  items={selectFieldOptions.inverterPumpOutletOpts}
                />
                <SelectField
                  name="inv_pump_outlet_pw_qty"
                  label="Uscite Dosatron"
                  items={selectFieldOptions.inverterPumpOutletOpts}
                />
              </>
            </FieldsetItem>
          )}
          <FieldsetItem>
            <div className="space-y-3">
              <SelectField
                name="water_2_type"
                label="Tipo acqua 2"
                items={selectFieldOptions.waterTypes2}
                fieldsToResetOnValue={[
                  {
                    triggerValue: zodEnums.WaterType2Enum.enum.NO_SELECTION,
                    fieldsToReset: ["water_2_pump"],
                  },
                ]}
              />
              <SelectField
                name="water_2_pump"
                label="Pompa di rilancio"
                disabled={!(waterType2Watch in zodEnums.WaterType1Enum.enum)}
                items={selectFieldOptions.waterPump2Opts}
              />
            </div>
          </FieldsetItem>
          {!hasInvPump && <FieldsetItem />}
        </FieldsetRow>
        <div className="">
          <CheckboxField name="has_antifreeze" label="Scarico invernale" />
        </div>
      </FieldsetContent>
    </Fieldset>
  );
};

export default WaterSupplySection;

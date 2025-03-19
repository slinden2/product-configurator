import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { NOT_SELECTED_VALUE, withNoSelection } from "@/lib/utils";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useWatch } from "react-hook-form";

const WaterSupplySection = () => {
  const water2TypeWatch = useWatch({ name: "water_2_type" });
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
                items={selectFieldOptions.waterTypes}
              />
              <SelectField
                name="water_1_pump"
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
                  label="Uscite idropulitrice"
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
                items={withNoSelection(selectFieldOptions.waterTypes)}
                fieldsToResetOnValue={[
                  {
                    triggerValue: NOT_SELECTED_VALUE,
                    fieldsToReset: ["water_2_pump"],
                  },
                ]}
              />
              <SelectField
                name="water_2_pump"
                label="Pompa di rilancio"
                disabled={!(water2TypeWatch in zodEnums.WaterTypeEnum.enum)}
                items={withNoSelection(selectFieldOptions.waterPump2Opts)}
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

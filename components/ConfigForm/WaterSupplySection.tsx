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
  const waterType2Watch = useWatch({ name: "water_type_2" });

  return (
    <Fieldset title="Alimentazione acqua">
      <FieldsetContent>
        <FieldsetRow className="md:items-start">
          <FieldsetItem>
            <div className="space-y-3">
              <SelectField
                name="water_type_1"
                label="Tipo acqua 1"
                items={selectFieldOptions.waterTypes1}
              />
              <SelectField
                name="booster_pump_1"
                label="Pompa di rilancio"
                items={selectFieldOptions.boosterPumps}
              />
            </div>
          </FieldsetItem>
          <FieldsetItem>
            <div className="space-y-3">
              <SelectField
                name="water_type_2"
                label="Tipo acqua 2"
                items={selectFieldOptions.waterTypes2}
                fieldsToResetOnValue={[
                  {
                    triggerValue: zodEnums.WaterType2Enum.enum.NO_SELECTION,
                    fieldsToReset: ["booster_pump_2"],
                  },
                ]}
              />

              <SelectField
                name="booster_pump_2"
                label="Pompa di rilancio"
                disabled={!(waterType2Watch in zodEnums.WaterType1Enum.enum)}
                items={selectFieldOptions.boosterPumps}
              />
            </div>
          </FieldsetItem>
          <FieldsetItem />
        </FieldsetRow>
        <div className="">
          <CheckboxField name="has_antifreeze" label="Scarico invernale" />
        </div>
      </FieldsetContent>
    </Fieldset>
  );
};

export default WaterSupplySection;

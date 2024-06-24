import CheckboxField from "@/components/CheckboxField";
import FormSection from "@/components/FormSection";
import SelectField from "@/components/SelectField";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useWatch } from "react-hook-form";

const WaterSupplySection = () => {
  const waterType2Watch = useWatch({ name: "water_type_2" });

  return (
    <FormSection title="Alimentazione acqua">
      <div className="space-y-3">
        <div className="md:flex md:gap-4 md:space-y-0 space-y-2">
          <div className="md:flex-1 ">
            <div className="space-y-2">
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
          </div>
          <div className="md:flex-1 ">
            <div className="space-y-2">
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
              {waterType2Watch &&
                waterType2Watch in zodEnums.WaterType1Enum.enum && (
                  <SelectField
                    name="booster_pump_2"
                    label="Pompa di rilancio"
                    items={selectFieldOptions.boosterPumps}
                  />
                )}
            </div>
          </div>
          <div className="hidden md:block md:flex-1" />
        </div>
        <div className="">
          <CheckboxField name="has_antifreeze" label="Scarico invernale" />
        </div>
      </div>
    </FormSection>
  );
};

export default WaterSupplySection;

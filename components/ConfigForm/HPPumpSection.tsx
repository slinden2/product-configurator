import CheckboxField from "@/components/CheckboxField";
import Fieldset from "@/components/Fieldset";
import FieldsetRow from "@/components/FieldsetRow";
import SelectField from "@/components/SelectField";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useWatch } from "react-hook-form";
import FieldsetItem from "@/components/FieldsetItem";
import FieldsetContent from "@/components/FieldsetContent";

const HPPumpSection = () => {
  const has15kwPumpWatch = useWatch({ name: "has_15kw_pump" });
  const has30kwPumpWatch = useWatch({ name: "has_30kw_pump" });
  const hasOMZPumpWatch = useWatch({ name: "has_omz_pump" });
  const omzPumpOutletWatch = useWatch({ name: "pump_outlet_omz" });

  return (
    <Fieldset title="Pompe HP">
      <FieldsetContent className="space-y-6 md:space-y-3">
        <FieldsetRow>
          <FieldsetItem className="md:self-end md:pb-3">
            <CheckboxField
              name="has_15kw_pump"
              label="Pompa 15kW"
              fieldsToResetOnUncheck={[
                "pump_outlet_1_15kw",
                "pump_outlet_2_15kw",
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="pump_outlet_1_15kw"
              label="Uscita 1"
              disabled={!has15kwPumpWatch}
              items={selectFieldOptions.hpPumpOutlet15kwTypes}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="pump_outlet_2_15kw"
              label="Uscita 2"
              disabled={!has15kwPumpWatch}
              items={selectFieldOptions.hpPumpOutlet15kwTypes}
            />
          </FieldsetItem>
        </FieldsetRow>
        <FieldsetRow>
          <FieldsetItem className="md:self-end md:pb-3">
            <CheckboxField
              name="has_30kw_pump"
              label="Pompa 30kW"
              fieldsToResetOnUncheck={[
                "pump_outlet_1_30kw",
                "pump_outlet_2_30kw",
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="pump_outlet_1_30kw"
              label="Uscita 1"
              disabled={!has30kwPumpWatch}
              items={selectFieldOptions.hpPumpOutlet30kwTypes}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="pump_outlet_2_30kw"
              label="Uscita 2"
              disabled={!has30kwPumpWatch}
              items={selectFieldOptions.hpPumpOutlet30kwTypes}
            />
          </FieldsetItem>
        </FieldsetRow>
        <FieldsetRow>
          <FieldsetItem className="md:self-center md:mt-1">
            <CheckboxField
              name="has_omz_pump"
              label="Pompa OMZ"
              fieldsToResetOnUncheck={[
                "pump_outlet_omz",
                "has_chemical_roof_bar",
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="pump_outlet_omz"
              label="Uscita 1"
              disabled={!hasOMZPumpWatch}
              items={selectFieldOptions.omzPumpOutletTypes}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.OMZPumpOutletEnum.enum.SPINNERS,
                  fieldsToReset: ["has_chemical_roof_bar"],
                },
              ]}
            />
            <div
              className={`md:mt-2 ${
                omzPumpOutletWatch ===
                  zodEnums.OMZPumpOutletEnum.enum.HP_ROOF_BAR ||
                omzPumpOutletWatch ===
                  zodEnums.OMZPumpOutletEnum.enum.HP_ROOF_BAR_SPINNERS
                  ? "opacity-100"
                  : "opacity-0"
              }`}>
              <CheckboxField
                name="has_chemical_roof_bar"
                label="Con barra di prelavaggio"
              />
            </div>
          </FieldsetItem>
          <FieldsetItem />
        </FieldsetRow>
      </FieldsetContent>
    </Fieldset>
  );
};

export default HPPumpSection;

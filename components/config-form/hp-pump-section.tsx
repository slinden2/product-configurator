import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetContent from "@/components/fieldset-content";
import { withNoSelection } from "@/lib/utils";
import { ConfigSchema } from "@/validation/config-schema";

const HPPumpSection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const has15kwPumpWatch = useWatch({ control, name: "has_15kw_pump" });
  const has30kwPumpWatch = useWatch({ control, name: "has_30kw_pump" });
  const hasOMZPumpWatch = useWatch({ control, name: "has_omz_pump" });
  const omzPumpOutletWatch = useWatch({ control, name: "pump_outlet_omz" });

  const showChemicalRoofBar =
    omzPumpOutletWatch === zodEnums.OMZPumpOutletEnum.enum.HP_ROOF_BAR ||
    omzPumpOutletWatch === zodEnums.OMZPumpOutletEnum.enum.HP_ROOF_BAR_SPINNERS;

  return (
    <Fieldset
      title="Pompe HP"
      description="Seleziona le pompe alta pressione e le tipologie di uscite da includere nella configurazione"
    >
      <FieldsetContent className="space-y-6 md:space-y-3">
        <FieldsetRow>
          <FieldsetItem className="md:self-end md:pb-3">
            <CheckboxField<ConfigSchema>
              name="has_15kw_pump"
              label="Pompa 15kW"
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: ["pump_outlet_1_15kw", "pump_outlet_2_15kw"],
                },
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField<ConfigSchema>
              name="pump_outlet_1_15kw"
              dataType="string"
              label="Uscita 1"
              disabled={!has15kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet15kwTypes)}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField<ConfigSchema>
              name="pump_outlet_2_15kw"
              dataType="string"
              label="Uscita 2"
              disabled={!has15kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet15kwTypes)}
            />
          </FieldsetItem>
        </FieldsetRow>
        <FieldsetRow>
          <FieldsetItem className="md:self-end md:pb-3">
            <CheckboxField<ConfigSchema>
              name="has_30kw_pump"
              label="Pompa 30kW"
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: ["pump_outlet_1_30kw", "pump_outlet_2_30kw"],
                },
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField<ConfigSchema>
              name="pump_outlet_1_30kw"
              dataType="string"
              label="Uscita 1"
              disabled={!has30kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet30kwTypes)}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField<ConfigSchema>
              name="pump_outlet_2_30kw"
              dataType="string"
              label="Uscita 2"
              disabled={!has30kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet30kwTypes)}
            />
          </FieldsetItem>
        </FieldsetRow>
        <FieldsetRow>
          <FieldsetItem className="md:self-center md:mt-1">
            <CheckboxField<ConfigSchema>
              name="has_omz_pump"
              label="Pompa OMZ"
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: ["pump_outlet_omz"],
                  resetToValue: undefined,
                },
                {
                  fieldsToReset: ["has_chemical_roof_bar"],
                  resetToValue: false,
                },
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField<ConfigSchema>
              name="pump_outlet_omz"
              dataType="string"
              label="Uscita 1"
              disabled={!hasOMZPumpWatch}
              items={selectFieldOptions.omzPumpOutletTypes}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.OMZPumpOutletEnum.enum.SPINNERS,
                  fieldsToReset: ["has_chemical_roof_bar"],
                  resetToValue: false,
                },
              ]}
            />
            <div
              className={`md:mt-2 ${
                showChemicalRoofBar ? "opacity-100" : "opacity-0"
              }`}
            >
              <CheckboxField<ConfigSchema>
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

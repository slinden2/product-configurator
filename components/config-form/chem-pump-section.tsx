import Fieldset from "@/components/fieldset";
import CheckboxField from "@/components/checkbox-field";
import SelectField from "@/components/select-field";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import FieldsetContent from "@/components/fieldset-content";
import { ConfigSchema } from "@/validation/config-schema";

const ChemPumpSection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const hasChemicalPumpWatch = useWatch({control, name: "has_chemical_pump" });
  const hasAcidPumpWatch = useWatch({control, name: "has_acid_pump" });

  return (
    <Fieldset
      title="Pompe dosatrici"
      description="Seleziona le pompe da includere nella configurazione">
      <FieldsetContent>
        <div className="grid grid-rows-2 grid-cols-2 md:grid-rows-1 md:grid-cols-4">
          <div className="order-1 my-1 md:my-0">
            <CheckboxField<ConfigSchema> name="has_shampoo_pump" label="Pompa sapone" />
          </div>
          <div className="order-3 my-1 md:my-0 md:order-2">
            <CheckboxField<ConfigSchema> name="has_wax_pump" label="Pompa cera" />
          </div>
          <div className="order-2 my-1 md:my-0 md:oder-3">
            <CheckboxField<ConfigSchema>
              name="has_chemical_pump"
              label="Pompa prelavaggio"
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: [
                    "chemical_qty",
                    "chemical_pump_pos",
                  ]
                },
                {
                  fieldsToReset: [
                    "has_foam"
                  ],
                  resetToValue: false
                }
              ]}
            />
          </div>
          <div className="order-4 my-1 md:my-0">
            <CheckboxField<ConfigSchema>
              name="has_acid_pump"
              label="Pompa acido"
              description="Solo per OMZ"
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: [
                    "acid_pump_pos"
                  ]
                }
              ]}
            />
          </div>
        </div>
      </FieldsetContent>
      <div
        className={`${
          hasChemicalPumpWatch || hasAcidPumpWatch ? "space-y-6 pt-10" : "pt-3"
        }`}>
        {hasChemicalPumpWatch && (
          <div>
            <div className="md:flex md:gap-4">
              <div className="md:flex-1 my-4">
                <SelectField<ConfigSchema>
                  name="chemical_qty"
                  dataType="number"
                  label="Numero di pompe di prelavaggio"
                  description="La seconda pompa serve esclusivamente per le barre di prelavaggio basse."
                  items={selectFieldOptions.chemicalNum}
                />
              </div>
              <div className="md:flex-1 my-4">
                <SelectField<ConfigSchema>
                  name="chemical_pump_pos"
                  dataType="string"
                  label="Posizione delle pompe di prelavaggio"
                  items={selectFieldOptions.chemicalPumpPositions}
                />
              </div>
            </div>
            <CheckboxField<ConfigSchema> name="has_foam" label="Nebulizzazione con schiuma" />
          </div>
        )}
        {hasAcidPumpWatch && (
          <div>
            <SelectField<ConfigSchema>
              name="acid_pump_pos"
              dataType="string"
              label="Posizione della pompa acido"
              items={selectFieldOptions.chemicalPumpPositions}
            />
          </div>
        )}
      </div>
    </Fieldset>
  );
};

export default ChemPumpSection;

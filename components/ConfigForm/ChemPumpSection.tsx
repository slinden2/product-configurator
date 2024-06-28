import Fieldset from "@/components/Fieldset";
import CheckboxField from "@/components/CheckboxField";
import SelectField from "@/components/SelectField";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";
import { useWatch } from "react-hook-form";
import FieldsetContent from "@/components/FieldsetContent";

const ChemPumpSection = () => {
  const hasChemicalPumpWatch = useWatch({ name: "has_chemical_pump" });
  const hasAcidPumpWatch = useWatch({ name: "has_acid_pump" });

  return (
    <Fieldset title="Pompe dosatrici">
      <FieldsetContent>
        <div className="grid grid-rows-2 grid-cols-2 md:grid-rows-1 md:grid-cols-4">
          <div className="order-1 my-1 md:my-0">
            <CheckboxField name="has_shampoo_pump" label="Pompa sapone" />
          </div>
          <div className="order-3 my-1 md:my-0 md:order-2">
            <CheckboxField name="has_wax_pump" label="Pompa cera" />
          </div>
          <div className="order-2 my-1 md:my-0 md:oder-3">
            <CheckboxField
              name="has_chemical_pump"
              label="Pompa prelavaggio"
              fieldsToResetOnUncheck={[
                "chemical_qty",
                "chemical_pump_pos",
                "has_foam",
              ]}
            />
          </div>
          <div className="order-4 my-1 md:my-0">
            <CheckboxField
              name="has_acid_pump"
              label="Pompa acido"
              description="Solo per OMZ"
              fieldsToResetOnUncheck={["acid_pump_pos"]}
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
                <SelectField
                  name="chemical_qty"
                  label="Numero di pompe di prelavaggio"
                  description="La seconda pompa serve esclusivamente per le barre di prelavaggio basse."
                  items={selectFieldOptions.chemicalNum}
                />
              </div>
              <div className="md:flex-1 my-4">
                <SelectField
                  name="chemical_pump_pos"
                  label="Posizione delle pompe di prelavaggio"
                  items={selectFieldOptions.chemicalPumpPositions}
                />
              </div>
            </div>
            <CheckboxField name="has_foam" label="Nebulizzazione con schiuma" />
          </div>
        )}
        {hasAcidPumpWatch && (
          <div>
            <SelectField
              name="acid_pump_pos"
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

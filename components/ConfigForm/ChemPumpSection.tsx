import CheckboxField from "@/components/CheckboxField";
import FormSection from "@/components/FormSection";
import SelectField from "@/components/SelectField";
import { Separator } from "@/components/ui/separator";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";
import { useWatch } from "react-hook-form";

const ChemPumpSection = () => {
  const hasChemicalPumpWatch = useWatch({ name: "has_chemical_pump" });
  const hasAcidPumpWatch = useWatch({ name: "has_acid_pump" });

  return (
    <FormSection title="Pompe dosatrici">
      <div className="mt-4 grid grid-rows-2 grid-cols-2 md:grid-rows-1 md:grid-cols-4">
        <CheckboxField
          name="has_shampoo_pump"
          label="Pompa sapone"
          containerClassName=""
        />
        <CheckboxField
          name="has_wax_pump"
          label="Pompa cera"
          containerClassName="ml-auto md:ml-0 w-32 md:w-max"
        />
        <CheckboxField
          name="has_chemical_pump"
          label="Pompa prelavaggio"
          containerClassName="md:ml-auto"
          fieldsToResetOnUncheck={[
            "chemical_num",
            "chemical_pump_pos",
            "has_foam",
          ]}
        />
        <CheckboxField
          name="has_acid_pump"
          label="Pompa acido"
          description="Solo per OMZ"
          containerClassName="ml-auto w-32 md:w-max"
          fieldsToResetOnUncheck={["acid_pump_pos"]}
        />
      </div>
      {hasChemicalPumpWatch && (
        <div>
          <Separator className="my-4" />
          <div className="md:flex md:gap-4">
            <div className="md:flex-1 my-4">
              <SelectField
                name="chemical_num"
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
          <Separator className="my-4" />
          <SelectField
            name="acid_pump_pos"
            label="Posizione della pompa acido"
            items={selectFieldOptions.chemicalPumpPositions}
          />
        </div>
      )}
    </FormSection>
  );
};

export default ChemPumpSection;

"use client";

import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import {
  canHaveAcidPump,
  canHaveShampooPump,
  showAcidPumpDetails,
  showChemicalPumpDetails,
} from "@/lib/configuration/display-rules";
import { CONFIG_FIELD_LABELS } from "@/lib/configuration/field-labels";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions } from "@/validation/configuration";

const ChemPumpSection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const brushNumWatch = useWatch({ control, name: "brush_qty" });
  const hasChemicalPumpWatch = useWatch({ control, name: "has_chemical_pump" });
  const hasAcidPumpWatch = useWatch({ control, name: "has_acid_pump" });

  const showChemicalDetails = showChemicalPumpDetails({
    has_chemical_pump: hasChemicalPumpWatch,
  });
  const showAcidDetails = showAcidPumpDetails({
    has_acid_pump: hasAcidPumpWatch,
  });
  const shampooPumpAllowed = canHaveShampooPump({ brush_qty: brushNumWatch });
  const acidPumpAllowed = canHaveAcidPump({ brush_qty: brushNumWatch });

  return (
    <Fieldset
      title="Pompe dosatrici"
      description="Seleziona le pompe da includere nella configurazione"
    >
      <div className="fs-content">
        <div className="grid grid-rows-2 grid-cols-2 md:grid-rows-1 md:grid-cols-4">
          <div className="order-1 my-1 md:my-0">
            <CheckboxField<ConfigSchema>
              name="has_shampoo_pump"
              label={CONFIG_FIELD_LABELS.has_shampoo_pump}
              disabled={!shampooPumpAllowed}
            />
          </div>
          <div className="order-3 my-1 md:my-0 md:order-2">
            <CheckboxField<ConfigSchema>
              name="has_wax_pump"
              label={CONFIG_FIELD_LABELS.has_wax_pump}
            />
          </div>
          <div className="order-2 my-1 md:my-0 md:order-3">
            <CheckboxField<ConfigSchema>
              name="has_chemical_pump"
              label={CONFIG_FIELD_LABELS.has_chemical_pump}
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: ["chemical_qty", "chemical_pump_pos"],
                },
                {
                  fieldsToReset: ["has_foam"],
                  resetToValue: false,
                },
              ]}
            />
          </div>
          <div className="order-4 my-1 md:my-0">
            <CheckboxField<ConfigSchema>
              name="has_acid_pump"
              label={CONFIG_FIELD_LABELS.has_acid_pump}
              description="Solo per OMZ"
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: ["acid_pump_pos"],
                },
              ]}
              disabled={!acidPumpAllowed}
            />
          </div>
        </div>
      </div>
      <div
        className={`${
          showChemicalDetails || showAcidDetails ? "space-y-6 pt-10" : "pt-3"
        }`}
      >
        {showChemicalDetails && (
          <div>
            <div className="fs-row">
              <div className="fs-item">
                <SelectField<ConfigSchema>
                  name="chemical_qty"
                  dataType="number"
                  label={CONFIG_FIELD_LABELS.chemical_qty}
                  description="La seconda pompa serve esclusivamente per le barre di prelavaggio basse."
                  items={selectFieldOptions.chemicalNum}
                />
              </div>
              <div className="fs-item my-4">
                <SelectField<ConfigSchema>
                  name="chemical_pump_pos"
                  dataType="string"
                  label={CONFIG_FIELD_LABELS.chemical_pump_pos}
                  items={selectFieldOptions.chemicalPumpPositions}
                />
              </div>
            </div>
            <CheckboxField<ConfigSchema>
              name="has_foam"
              label={CONFIG_FIELD_LABELS.has_foam}
            />
          </div>
        )}
        {showAcidDetails && (
          <div>
            <SelectField<ConfigSchema>
              name="acid_pump_pos"
              dataType="string"
              label={CONFIG_FIELD_LABELS.acid_pump_pos}
              items={selectFieldOptions.chemicalPumpPositions}
              disabled={!acidPumpAllowed}
            />
          </div>
        )}
      </div>
    </Fieldset>
  );
};

export default ChemPumpSection;

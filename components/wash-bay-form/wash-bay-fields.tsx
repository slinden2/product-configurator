import CheckboxField from "@/components/checkbox-field";
import SelectField from "@/components/select-field";
import { NOT_SELECTED_VALUE, withNoSelection } from "@/lib/utils";
import { getNumericSelectOptions } from "@/validation/common";
import { selectFieldOptions } from "@/validation/configuration";
import { WashBaySchema } from "@/validation/wash-bay-schema";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

interface WashBayFieldsProps {
  supplyType?: string;
}

const WashBayFields = ({ supplyType }: WashBayFieldsProps) => {
  const { control } = useFormContext<WashBaySchema>();
  const pressureWashTypeWatch = useWatch({
    control,
    name: "pressure_washer_type",
  });
  const hasGantryWatch = useWatch({ control, name: "has_gantry" });

  const showEnergyChainFields =
    hasGantryWatch && supplyType === "ENERGY_CHAIN";

  return (
    <div className="fs-content">
      <div className="fs-row">
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="hp_lance_qty"
            dataType="number"
            label="Numero lance HP"
            items={getNumericSelectOptions([0, 2])}
          />
        </div>
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="det_lance_qty"
            dataType="number"
            label={`Numero lance detergente`}
            items={getNumericSelectOptions([0, 2])}
          />
        </div>
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="hose_reel_qty"
            dataType="number"
            label="Numero avvolgitori"
            items={getNumericSelectOptions([0, 1, 2])}
          />
        </div>
      </div>
      <div className="fs-row">
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="pressure_washer_type"
            dataType="string"
            label="Tipo idropulitrice"
            items={withNoSelection(selectFieldOptions.pressureWasherOpts)}
            fieldsToResetOnValue={[
              {
                triggerValue: NOT_SELECTED_VALUE,
                fieldsToReset: ["pressure_washer_qty"],
              },
            ]}
          />
        </div>
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="pressure_washer_qty"
            dataType="number"
            label="Numero idropulitrici"
            disabled={!pressureWashTypeWatch}
            items={getNumericSelectOptions([1, 2])}
          />
        </div>
      </div>
      <div className="fs-row">
        <div className="fs-item">
          <CheckboxField<WashBaySchema>
            name="has_gantry"
            label="Pista con portale"
            fieldsToResetOnUncheck={[
              {
                fieldsToReset: ["energy_chain_width", "has_shelf_extension"],
                resetToValue: undefined,
              },
            ]}
          />
        </div>
        <div className="fs-item">
          <CheckboxField<WashBaySchema>
            name="is_first_bay"
            label="Prima pista"
          />
        </div>
        <div className="fs-item">
          <CheckboxField<WashBaySchema>
            name="has_bay_dividers"
            label="Con pannellature"
          />
        </div>
      </div>
      {showEnergyChainFields && (
        <div className="fs-row md:items-end">
          <div className="fs-item">
            <SelectField<WashBaySchema>
              name="energy_chain_width"
              dataType="string"
              label="Larghezza catena"
              items={selectFieldOptions.cableChainWidths}
            />
          </div>
          <div className="fs-item">
            <CheckboxField<WashBaySchema>
              name="has_shelf_extension"
              label="Con prolunga per mensola alim."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WashBayFields;

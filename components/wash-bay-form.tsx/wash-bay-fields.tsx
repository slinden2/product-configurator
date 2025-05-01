import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { NOT_SELECTED_VALUE, withNoSelection } from "@/lib/utils";
import { getNumericSelectOptions } from "@/validation/common";
import { selectFieldOptions } from "@/validation/configuration";
import { WashBaySchema } from "@/validation/wash-bay-schema";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

const WashBayFields = () => {
  const { control } = useFormContext<WashBaySchema>();
  const pressureWashTypeWatch = useWatch({
    control,
    name: "pressure_washer_type",
  });

  return (
    <FieldsetContent>
      <FieldsetRow>
        <FieldsetItem>
          <SelectField<WashBaySchema>
            name="hp_lance_qty"
            dataType="number"
            label="Numero lance HP"
            items={getNumericSelectOptions([0, 2])}
          />
        </FieldsetItem>
        <FieldsetItem>
          <SelectField<WashBaySchema>
            name="det_lance_qty"
            dataType="number"
            label={`Numero lance detergente`}
            items={getNumericSelectOptions([0, 2])}
          />
        </FieldsetItem>
        <FieldsetItem>
          <SelectField<WashBaySchema>
            name="hose_reel_qty"
            dataType="number"
            label="Numero avvolgitori"
            items={getNumericSelectOptions([0, 1, 2])}
          />
        </FieldsetItem>
      </FieldsetRow>
      <FieldsetRow>
        <FieldsetItem>
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
        </FieldsetItem>
        <FieldsetItem>
          <SelectField<WashBaySchema>
            name="pressure_washer_qty"
            dataType="number"
            label="Numero idropulitrici"
            disabled={!!!pressureWashTypeWatch}
            items={getNumericSelectOptions([1, 2, 3, 4])}
          />
        </FieldsetItem>
      </FieldsetRow>
      <FieldsetRow>
        <FieldsetItem>
          <CheckboxField<WashBaySchema>
            name="has_gantry"
            label="Pista con portale"
          />
        </FieldsetItem>
        <FieldsetItem>
          <CheckboxField<WashBaySchema>
            name="is_first_bay"
            label="Prima pista"
          />
        </FieldsetItem>
        <FieldsetItem>
          <CheckboxField<WashBaySchema>
            name="has_bay_dividers"
            label="Con pannellature"
          />
        </FieldsetItem>
      </FieldsetRow>
    </FieldsetContent>
  );
};

export default WashBayFields;

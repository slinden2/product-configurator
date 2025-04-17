import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { getNumericSelectOptions } from "@/validation/common";
import { selectFieldOptions } from "@/validation/configuration";
import React from "react";

const WaterTankSection = () => {
  return (
    <Fieldset title="Serbatoio">
      <FieldsetContent>
        <FieldsetRow>
          <FieldsetItem>
            <SelectField
              name="type"
              label="Tipo di serbatoio"
              items={selectFieldOptions.waterTankOpts}
            />
          </FieldsetItem>
        </FieldsetRow>
        <FieldsetRow>
          <FieldsetItem>
            <SelectField
              name="inlet_w_float_qty"
              label="Ingressi c/ galleggiante"
              items={getNumericSelectOptions([0, 1, 2])}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="inlet_no_float_qty"
              label="Ingressi no galleggiante"
              items={getNumericSelectOptions([0, 1, 2])}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="outlet_w_valve_qty"
              label="Uscite c/ rubinetto"
              items={getNumericSelectOptions([0, 1, 2])}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="outlet_no_valve_qty"
              label="Uscite no rubinetto"
              items={getNumericSelectOptions([0, 1, 2])}
            />
          </FieldsetItem>
        </FieldsetRow>
        <FieldsetRow>
          <FieldsetItem>
            <CheckboxField name="has_blower" label="Con soffiante" />
          </FieldsetItem>
        </FieldsetRow>
      </FieldsetContent>
    </Fieldset>
  );
};

export default WaterTankSection;

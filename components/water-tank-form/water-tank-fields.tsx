import CheckboxField from "@/components/checkbox-field";
import SelectField from "@/components/select-field";
import { getNumericSelectOptions } from "@/validation/common";
import { selectFieldOptions } from "@/validation/configuration";
import { WaterTankSchema } from "@/validation/water-tank-schema";
import React from "react";

const WaterTankFields = () => {
  return (
    <div className="fs-content">
      <div className="fs-row">
        <div className="fs-item">
          <SelectField<WaterTankSchema>
            name="type"
            dataType="string"
            label="Tipo di serbatoio"
            items={selectFieldOptions.waterTankOpts}
          />
        </div>
      </div>
      <div className="fs-row">
        <div className="fs-item">
          <SelectField<WaterTankSchema>
            name="inlet_w_float_qty"
            dataType="number"
            label="Ingressi c/ galleggiante"
            items={getNumericSelectOptions([0, 1, 2])}
          />
        </div>
        <div className="fs-item">
          <SelectField<WaterTankSchema>
            name="inlet_no_float_qty"
            dataType="number"
            label="Ingressi no galleggiante"
            items={getNumericSelectOptions([0, 1, 2])}
          />
        </div>
        <div className="fs-item">
          <SelectField<WaterTankSchema>
            name="outlet_w_valve_qty"
            dataType="number"
            label="Uscite c/ rubinetto"
            items={getNumericSelectOptions([0, 1, 2])}
          />
        </div>
        <div className="fs-item">
          <SelectField<WaterTankSchema>
            name="outlet_no_valve_qty"
            dataType="number"
            label="Uscite no rubinetto"
            items={getNumericSelectOptions([0, 1, 2])}
          />
        </div>
      </div>
      <div className="fs-row">
        <div className="fs-item">
          <CheckboxField<WaterTankSchema>
            name="has_blower"
            label="Con soffiante"
          />
        </div>
      </div>
    </div>
  );
};

export default WaterTankFields;

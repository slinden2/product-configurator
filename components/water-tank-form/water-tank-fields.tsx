import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import SelectField from "@/components/select-field";
import { getNumericSelectOptions } from "@/validation/common";
import { selectFieldOptions } from "@/validation/configuration";
import type { WaterTankSchema } from "@/validation/water-tank-schema";

const WaterTankFields = () => {
  const { control } = useFormContext<WaterTankSchema>();
  const inletNoFloatQty = useWatch<WaterTankSchema>({
    control,
    name: "inlet_no_float_qty",
  });
  const showBlowerAndFloat = inletNoFloatQty === 1;

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
            items={getNumericSelectOptions([0, 1])}
            fieldsToResetOnValue={[
              {
                triggerValue: 0,
                fieldsToReset: [
                  "has_blower",
                  "has_electric_float_for_purifier",
                ],
                resetToValue: false,
              },
            ]}
          />
        </div>
        <div className="fs-item">
          <SelectField<WaterTankSchema>
            name="outlet_w_valve_qty"
            dataType="number"
            label="Uscite c/ rubinetto"
            items={getNumericSelectOptions([0, 1, 2, 3])}
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
      {showBlowerAndFloat && (
        <div className="fs-row">
          <div className="fs-item">
            <CheckboxField<WaterTankSchema>
              name="has_blower"
              label="Con soffiante"
            />
          </div>
          <div className="fs-item">
            <CheckboxField<WaterTankSchema>
              name="has_electric_float_for_purifier"
              label="Galleggiante elettrico per depuratore"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterTankFields;

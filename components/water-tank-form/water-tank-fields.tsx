import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import SelectField from "@/components/select-field";
import { showTankBlowerAndFloat } from "@/lib/configuration/display-rules";
import { WATER_TANK_FIELD_LABELS } from "@/lib/configuration/field-labels";
import { getNumericSelectOptions } from "@/validation/common";
import { selectFieldOptions } from "@/validation/configuration";
import type { WaterTankSchema } from "@/validation/water-tank-schema";

const WaterTankFields = () => {
  const { control } = useFormContext<WaterTankSchema>();
  const inletNoFloatQty = useWatch<WaterTankSchema, "inlet_no_float_qty">({
    control,
    name: "inlet_no_float_qty",
  });
  const showBlowerAndFloat = showTankBlowerAndFloat({
    inlet_no_float_qty: inletNoFloatQty,
  });

  return (
    <div className="fs-content">
      <div className="fs-row">
        <div className="fs-item">
          <SelectField<WaterTankSchema>
            name="type"
            dataType="string"
            label={WATER_TANK_FIELD_LABELS.type}
            items={selectFieldOptions.waterTankOpts}
          />
        </div>
      </div>
      <div className="fs-row">
        <div className="fs-item">
          <SelectField<WaterTankSchema>
            name="inlet_w_float_qty"
            dataType="number"
            label={WATER_TANK_FIELD_LABELS.inlet_w_float_qty}
            items={getNumericSelectOptions([0, 1, 2])}
          />
        </div>
        <div className="fs-item">
          <SelectField<WaterTankSchema>
            name="inlet_no_float_qty"
            dataType="number"
            label={WATER_TANK_FIELD_LABELS.inlet_no_float_qty}
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
            label={WATER_TANK_FIELD_LABELS.outlet_w_valve_qty}
            items={getNumericSelectOptions([0, 1, 2, 3])}
          />
        </div>
        <div className="fs-item">
          <SelectField<WaterTankSchema>
            name="outlet_no_valve_qty"
            dataType="number"
            label={WATER_TANK_FIELD_LABELS.outlet_no_valve_qty}
            items={getNumericSelectOptions([0, 1, 2])}
          />
        </div>
      </div>
      {showBlowerAndFloat && (
        <div className="fs-row">
          <div className="fs-item">
            <CheckboxField<WaterTankSchema>
              name="has_blower"
              label={WATER_TANK_FIELD_LABELS.has_blower}
            />
          </div>
          <div className="fs-item">
            <CheckboxField<WaterTankSchema>
              name="has_electric_float_for_purifier"
              label={WATER_TANK_FIELD_LABELS.has_electric_float_for_purifier}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterTankFields;

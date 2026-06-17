import { useFormContext, useWatch } from "react-hook-form";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import { hasBrushes } from "@/lib/configuration/display-rules";
import { CONFIG_FIELD_LABELS } from "@/lib/configuration/field-labels";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions } from "@/validation/configuration";

const BrushSection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const brushNumWatch = useWatch<ConfigSchema, "brush_qty">({
    control,
    name: "brush_qty",
  });
  const isDisabled = !hasBrushes({ brush_qty: brushNumWatch });

  return (
    <Fieldset
      title="Spazzole"
      description="Compila i dati relativi alle spazzole"
    >
      <div className="fs-content">
        <div className="fs-row">
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="brush_qty"
              dataType="number"
              label={CONFIG_FIELD_LABELS.brush_qty}
              items={selectFieldOptions.brushNums}
              fieldsToResetOnValue={[
                {
                  triggerValue: 0,
                  fieldsToReset: [
                    "brush_type",
                    "brush_color",
                    "has_shampoo_pump",
                  ],
                },
                {
                  triggerValue: 2,
                  fieldsToReset: [
                    "has_acid_pump",
                    "acid_pump_pos",
                    "has_omz_pump",
                    "pump_outlet_omz",
                  ],
                },
              ]}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="brush_type"
              dataType="string"
              label={CONFIG_FIELD_LABELS.brush_type}
              disabled={isDisabled}
              items={selectFieldOptions.brushTypes}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="brush_color"
              dataType="string"
              label={CONFIG_FIELD_LABELS.brush_color}
              disabled={isDisabled}
              items={selectFieldOptions.brushColors}
            />
          </div>
        </div>
      </div>
    </Fieldset>
  );
};

export default BrushSection;

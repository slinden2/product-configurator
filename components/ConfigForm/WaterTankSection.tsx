import CheckboxField from "@/components/CheckboxField";
import { ConfigFormData } from "@/components/ConfigForm";
import Fieldset from "@/components/Fieldset";
import FieldsetContent from "@/components/FieldsetContent";
import FieldsetItem from "@/components/FieldsetItem";
import FieldsetRow from "@/components/FieldsetRow";
import SelectField from "@/components/SelectField";
import { Button } from "@/components/ui/button";
import { getNumericSelectOptions } from "@/validation/common";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import { Trash2 } from "lucide-react";
import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

const defaultObject: ConfigFormData["water_tanks"][0] = {
  type: "" as any,
  inlet_w_float_qty: "",
  inlet_no_float_qty: "",
  outlet_w_valve_qty: "",
  outlet_no_valve_qty: "",
  has_blower: false,
};

const WaterTankSection = () => {
  const { control } = useFormContext<ConfigFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "water_tanks",
  });

  return (
    <Fieldset title="Serbatoi">
      <FieldsetContent>
        {fields.map((field, index) => {
          return (
            <div key={field.id} className="p-4 border rounded-lg space-y-3">
              <FieldsetRow className="flex gap-8">
                <FieldsetItem className="flex-1 md:max-w-64">
                  <SelectField
                    name={`water_tanks.${index}.type` as any}
                    label={`Tipo di serbatoio #${index + 1}`}
                    items={selectFieldOptions.waterTankOpts}
                  />
                </FieldsetItem>
                <FieldsetItem className="md:flex-initial flex items-end pb-1 ml-auto">
                  <Button
                    className="ml-auto"
                    variant="destructive"
                    size="sm_icon"
                    onClick={() => remove(index)}>
                    <Trash2 size={20} />
                  </Button>
                </FieldsetItem>
              </FieldsetRow>
              <FieldsetRow>
                <FieldsetItem>
                  <SelectField
                    name={`water_tanks.${index}.inlet_w_float_qty` as any}
                    label="Ingressi c/ galleggiante"
                    items={getNumericSelectOptions([0, 1, 2])}
                  />
                </FieldsetItem>
                <FieldsetItem>
                  <SelectField
                    name={`water_tanks.${index}.inlet_no_float_qty` as any}
                    label="Ingressi no galleggiante"
                    items={getNumericSelectOptions([0, 1, 2])}
                  />
                </FieldsetItem>
                <FieldsetItem>
                  <SelectField
                    name={`water_tanks.${index}.outlet_w_valve_qty` as any}
                    label="Uscite c/ rubinetto"
                    items={getNumericSelectOptions([0, 1, 2])}
                  />
                </FieldsetItem>
                <FieldsetItem>
                  <SelectField
                    name={`water_tanks.${index}.outlet_no_valve_qty` as any}
                    label="Uscite no rubinetto"
                    items={getNumericSelectOptions([0, 1, 2])}
                  />
                </FieldsetItem>
              </FieldsetRow>
              <FieldsetRow>
                <FieldsetItem className="">
                  <CheckboxField
                    name={`water_tanks.${index}.has_blower` as any}
                    label="Con soffiante"
                  />
                </FieldsetItem>
              </FieldsetRow>
            </div>
          );
        })}
        <Button
          variant="link"
          type="button"
          onClick={() => append(defaultObject)}>
          Aggiungi serbatoio
        </Button>
      </FieldsetContent>
    </Fieldset>
  );
};

export default WaterTankSection;

import CheckboxField from "@/components/checkbox-field";
import { ConfigFormData } from "@/components/config-form";
import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { NOT_SELECTED_VALUE, withNoSelection } from "@/lib/utils";
import { getNumericSelectOptions } from "@/validation/common";
import { selectFieldOptions } from "@/validation/configuration";
import { Trash2 } from "lucide-react";
import React from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

const defaultObject: ConfigFormData["wash_bays"][0] = {
  hp_lance_qty: "" as any,
  det_lance_qty: "" as any,
  hose_reel_qty: "" as any,
  pressure_washer_type: "" as any,
  pressure_washer_qty: "" as any,
  has_gantry: false,
  is_first_bay: false,
  has_bay_dividers: false,
};

const WashBaySection = () => {
  const { control } = useFormContext<ConfigFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "wash_bays",
  });

  const washBayWatch = useWatch({
    name: "wash_bays",
    control: control,
  });

  return (
    <Fieldset title="Piste di lavaggio">
      <FieldsetContent>
        {fields.map((field, index) => {
          return (
            <fieldset
              key={field.id}
              className="relative p-4 border rounded-lg space-y-3">
              <Button
                className="absolute top-4 right-4"
                variant="destructive"
                size="sm_icon"
                onClick={() => remove(index)}>
                <Trash2 size={20} />
              </Button>
              <p>Pista #{index + 1}</p>
              <FieldsetRow>
                <FieldsetItem>
                  <SelectField
                    name={
                      `wash_bays.${index}.hp_lance_qty` as `wash_bays.0.hp_lance_qty` as any // FIXME
                    }
                    label="Numero lance HP"
                    items={getNumericSelectOptions([0, 2])}
                  />
                </FieldsetItem>
                <FieldsetItem>
                  <SelectField
                    name={
                      `wash_bays.${index}.det_lance_qty` as `wash_bays.0.det_lance_qty` as any // FIXME
                    }
                    label={`Numero lance detergente`}
                    items={getNumericSelectOptions([0, 2])}
                  />
                </FieldsetItem>
                <FieldsetItem>
                  <SelectField
                    name={
                      `wash_bays.${index}.hose_reel_qty` as `wash_bays.0.hose_reel_qty` as any // FIXME
                    }
                    label="Numero avvolgitori"
                    items={getNumericSelectOptions([0, 1, 2])}
                  />
                </FieldsetItem>
              </FieldsetRow>
              <FieldsetRow>
                <FieldsetItem>
                  <SelectField
                    name={
                      `wash_bays.${index}.pressure_washer_type` as `wash_bays.0.pressure_washer_type` as any // FIXME
                    }
                    label="Tipo idropulitrice"
                    items={withNoSelection(
                      selectFieldOptions.pressureWasherOpts
                    )}
                    fieldsToResetOnValue={[
                      {
                        triggerValue: NOT_SELECTED_VALUE,
                        fieldsToReset: [
                          `wash_bays.${index}.pressure_washer_qty` as any,
                        ],
                      },
                    ]}
                  />
                </FieldsetItem>
                <FieldsetItem>
                  <SelectField
                    name={
                      `wash_bays.${index}.pressure_washer_qty` as `wash_bays.0.pressure_washer_qty` as any // FIXME
                    }
                    label="Numero idropulitrici"
                    items={getNumericSelectOptions([1, 2, 3, 4])}
                    disabled={
                      (washBayWatch &&
                        washBayWatch[index]?.pressure_washer_type === null) ||
                      (washBayWatch &&
                        !washBayWatch[index]?.pressure_washer_type)
                    }
                  />
                </FieldsetItem>
              </FieldsetRow>
              <FieldsetRow>
                <FieldsetItem>
                  <CheckboxField
                    name={
                      `wash_bays.${index}.has_gantry` as `wash_bays.0.has_gantry` as any // FIXME
                    }
                    label="Pista con portale"
                  />
                </FieldsetItem>
                <FieldsetItem>
                  <CheckboxField
                    name={
                      `wash_bays.${index}.is_first_bay` as `wash_bays.0.is_first_bay` as any // FIXME
                    }
                    label="Prima pista"
                  />
                </FieldsetItem>
                <FieldsetItem>
                  <CheckboxField
                    name={
                      `wash_bays.${index}.has_bay_dividers` as `wash_bays.0.has_bay_dividers` as any // FIXME
                    }
                    label="Con pannellature"
                  />
                </FieldsetItem>
              </FieldsetRow>
            </fieldset>
          );
        })}
        <Button
          variant="link"
          type="button"
          onClick={() => append(defaultObject)}>
          Aggiungi pista
        </Button>
      </FieldsetContent>
    </Fieldset>
  );
};

export default WashBaySection;

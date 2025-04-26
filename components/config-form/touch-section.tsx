import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React, { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const TouchSection = () => {
  const { control, resetField } = useFormContext<ConfigSchema>();
  const touchQtyWatch = useWatch({ control, name: "touch_qty" });
  const touchPosWatch = useWatch({ control, name: "touch_pos" });
  const hasItecowebWatch = useWatch({ control, name: "has_itecoweb" });
  const hasCardReaderWatch = useWatch({ control, name: "has_card_reader" });

  useEffect(() => {
    // Resetting card_qty when itecoweb and card_reader are unchecked
    if (!hasItecowebWatch && !hasCardReaderWatch) {
      resetField("card_qty");
    }
  }, [hasItecowebWatch, hasCardReaderWatch, resetField]);

  useEffect(() => {
    if (
      touchQtyWatch === 1 &&
      touchPosWatch === zodEnums.TouchPosEnum.enum.INTERNAL
    ) {
      resetField("touch_fixing_type");
    }
  }, [touchQtyWatch, touchPosWatch, resetField]);

  return (
    <Fieldset
      title="Configurazione quadro elettrico"
      description="Configura il quadro elettrico e i touch screen del portale"
    >
      <FieldsetContent>
        <FieldsetRow>
          <FieldsetItem>
            <SelectField<ConfigSchema>
              name="touch_qty"
              dataType="number"
              label="Numero di pannelli"
              items={selectFieldOptions.touchQtyOpts}
              fieldsToResetOnValue={[
                {
                  triggerValue: 2,
                  fieldsToReset: ["touch_pos"],
                },
                {
                  triggerValue: 1,
                  fieldsToReset: ["touch_fixing_type"],
                },
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField<ConfigSchema>
              name="touch_pos"
              dataType="string"
              label="Posizione touch"
              disabled={touchQtyWatch !== 1}
              items={selectFieldOptions.touchPositionOpts}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.TouchPosEnum.enum.INTERNAL,
                  fieldsToReset: ["touch_fixing_type"],
                },
              ]}
            />
            {/* )} */}
          </FieldsetItem>
          <FieldsetItem>
            <SelectField<ConfigSchema>
              name="touch_fixing_type"
              dataType="string"
              label="Fissaggio touch esterno"
              disabled={touchQtyWatch !== 2 && touchPosWatch !== "EXTERNAL"}
              items={selectFieldOptions.touchFixingTypeOpts}
            />
          </FieldsetItem>
        </FieldsetRow>
        <FieldsetRow>
          <div>
            <CheckboxField name="has_itecoweb" label="Itecoweb" />
          </div>
          <div>
            <CheckboxField name="has_card_reader" label="Lettore schede" />
          </div>
          <div>
            <CheckboxField name="is_fast" label="Portale fast" />
          </div>
        </FieldsetRow>
        {(hasItecowebWatch || hasCardReaderWatch) && (
          <div className="w-1/2 md:w-1/3">
            <SelectField
              name="card_qty"
              dataType="number"
              label="Numero di schede"
              items={selectFieldOptions.cardQtyOpts}
            />
          </div>
        )}
      </FieldsetContent>
    </Fieldset>
  );
};

export default TouchSection;

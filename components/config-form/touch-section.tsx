import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import FieldsetItem from "@/components/fieldset-item";
import FieldsetRow from "@/components/fieldset-row";
import SelectField from "@/components/select-field";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

const TouchSection = () => {
  const { setValue } = useFormContext();
  const touchQtyWatch = useWatch({ name: "touch_qty" });
  const touchPosWatch = useWatch({ name: "touch_pos" });
  const hasItecowebWatch = useWatch({ name: "has_itecoweb" });
  const hasCardReaderWatch = useWatch({ name: "has_card_reader" });

  const touchQtyAsNum = parseInt(touchQtyWatch, 10);

  React.useEffect(() => {
    // Resetting card_qty when itecoweb and card_reader are unchecked
    if (!hasItecowebWatch && !hasCardReaderWatch) {
      setValue("card_qty", "");
    }
  }, [hasItecowebWatch, hasCardReaderWatch, setValue]);

  return (
    <Fieldset title="Configurazione quadro elettrico">
      <FieldsetContent>
        <FieldsetRow>
          <FieldsetItem>
            <SelectField
              name="touch_qty"
              label="Numero di pannelli"
              items={selectFieldOptions.touchQtyOpts}
              fieldsToResetOnValue={[
                {
                  triggerValue: 2,
                  fieldsToReset: ["touch_pos"],
                },
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            <SelectField
              name="touch_pos"
              label="Posizione touch"
              disabled={touchQtyAsNum !== 1}
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
            <SelectField
              name="touch_fixing_type"
              label="Fissaggio touch esterno"
              disabled={touchQtyAsNum !== 2 && touchPosWatch !== "EXTERNAL"}
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

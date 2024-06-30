import CheckboxField from "@/components/CheckboxField";
import Fieldset from "@/components/Fieldset";
import FieldsetContent from "@/components/FieldsetContent";
import FieldsetItem from "@/components/FieldsetItem";
import FieldsetRow from "@/components/FieldsetRow";
import SelectField from "@/components/SelectField";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

const PanelSection = () => {
  const { setValue } = useFormContext();
  const panelNumWatch = useWatch({ name: "touch_qty" });
  const panelPosWatch = useWatch({ name: "touch_pos" });
  const hasItecowebWatch = useWatch({ name: "has_itecoweb" });
  const hasCardReaderWatch = useWatch({ name: "has_card_reader" });

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
                  triggerValue: zodEnums.TouchQtyEnum.enum.TWO,
                  fieldsToReset: ["touch_pos"],
                },
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            {panelNumWatch === zodEnums.TouchQtyEnum.enum.ONE && (
              <SelectField
                name="touch_pos"
                label="Posizione pannello"
                items={selectFieldOptions.touchPositionOpts}
                fieldsToResetOnValue={[
                  {
                    triggerValue: zodEnums.TouchPosEnum.enum.INTERNAL,
                    fieldsToReset: ["touch_fixing_type"],
                  },
                ]}
              />
            )}
          </FieldsetItem>
          <FieldsetItem>
            {(panelNumWatch === zodEnums.TouchQtyEnum.enum.TWO ||
              panelPosWatch === "EXTERNAL") && (
              <SelectField
                name="touch_fixing_type"
                label="Fissaggio pannello esterno"
                items={selectFieldOptions.touchFixingTypeOpts}
              />
            )}
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

export default PanelSection;

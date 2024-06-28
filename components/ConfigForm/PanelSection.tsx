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
  const panelNumWatch = useWatch({ name: "panel_qty" });
  const panelPosWatch = useWatch({ name: "panel_pos" });
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
              name="panel_qty"
              label="Numero di pannelli"
              items={selectFieldOptions.panelNums}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.PanelNumEnum.enum.TWO,
                  fieldsToReset: ["panel_pos"],
                },
              ]}
            />
          </FieldsetItem>
          <FieldsetItem>
            {panelNumWatch === zodEnums.PanelNumEnum.enum.ONE && (
              <SelectField
                name="panel_pos"
                label="Posizione pannello"
                items={selectFieldOptions.panelPositions}
                fieldsToResetOnValue={[
                  {
                    triggerValue: zodEnums.PanelPosEnum.enum.INTERNAL,
                    fieldsToReset: ["ext_panel_fixing_type"],
                  },
                ]}
              />
            )}
          </FieldsetItem>
          <FieldsetItem>
            {(panelNumWatch === zodEnums.PanelNumEnum.enum.TWO ||
              panelPosWatch === "EXTERNAL") && (
              <SelectField
                name="ext_panel_fixing_type"
                label="Fissaggio pannello esterno"
                items={selectFieldOptions.extPanelFixingTypes}
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

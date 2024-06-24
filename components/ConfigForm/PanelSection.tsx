import CheckboxField from "@/components/CheckboxField";
import FormSection from "@/components/FormSection";
import InputField from "@/components/InputField";
import SelectField from "@/components/SelectField";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

const PanelSection = () => {
  const { setValue } = useFormContext();
  const panelNumWatch = useWatch({ name: "panel_num" });
  const panelPosWatch = useWatch({ name: "panel_pos" });
  const hasItecowebWatch = useWatch({ name: "has_itecoweb" });
  const hasCardReaderWatch = useWatch({ name: "has_card_reader" });

  React.useEffect(() => {
    // Resetting card_num when itecoweb and card_reader are unchecked
    if (!hasItecowebWatch && !hasCardReaderWatch) {
      setValue("card_num", "");
    }
  }, [hasItecowebWatch, hasCardReaderWatch, setValue]);

  return (
    <FormSection title="Configurazione quadro elettrico">
      <div className="space-y-3">
        <div className="md:flex md:gap-4">
          <div className="md:flex-1">
            <SelectField
              name="panel_num"
              label="Numero di pannelli"
              items={selectFieldOptions.panelNums}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.PanelNumEnum.enum.TWO,
                  fieldsToReset: ["panel_pos"],
                },
              ]}
            />
          </div>
          <div className="md:flex-1">
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
          </div>
          <div className="md:flex-1">
            {(panelNumWatch === zodEnums.PanelNumEnum.enum.TWO ||
              panelPosWatch === "EXTERNAL") && (
              <SelectField
                name="ext_panel_fixing_type"
                label="Fissaggio pannello esterno"
                items={selectFieldOptions.extPanelFixingTypes}
              />
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex gap-4">
            <div>
              <CheckboxField name="has_itecoweb" label="Itecoweb" />
            </div>
            <div>
              <CheckboxField name="has_card_reader" label="Lettore schede" />
            </div>
          </div>
          {(hasItecowebWatch || hasCardReaderWatch) && (
            <div className="w-1/3">
              <InputField
                name="card_num"
                label="Numero di schede"
                placeholder="Inserisci numero di schede"
              />
            </div>
          )}
        </div>
      </div>
    </FormSection>
  );
};

export default PanelSection;

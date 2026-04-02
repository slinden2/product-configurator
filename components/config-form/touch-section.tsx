import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const TouchSection = () => {
  const { control, setValue } = useFormContext<ConfigSchema>();
  const touchQtyWatch = useWatch({ control, name: "touch_qty" });
  const touchPosWatch = useWatch({ control, name: "touch_pos" });
  const hasItecowebWatch = useWatch({ control, name: "has_itecoweb" });
  const hasCardReaderWatch = useWatch({ control, name: "has_card_reader" });

  // Cross-field condition: reset card_qty only when BOTH itecoweb AND card_reader
  // are unchecked. This can't be expressed via single-field fieldsToResetOnUncheck
  // because each checkbox alone shouldn't reset card_qty while the other is checked.
  useEffect(() => {
    if (!hasItecowebWatch && !hasCardReaderWatch) {
      setValue("card_qty", 0, { shouldDirty: true });
    }
  }, [hasItecowebWatch, hasCardReaderWatch, setValue]);

  return (
    <Fieldset
      title="Configurazione quadro elettrico"
      description="Configura il quadro elettrico e i touch screen del portale"
    >
      <div className="fs-content">
        <div className="fs-row">
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="touch_qty"
              dataType="number"
              label="Numero di pannelli"
              description="Per l'opzione gestione piste occorrono due pannelli"
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
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="touch_pos"
              dataType="string"
              label="Posizione touch"
              disabled={touchQtyWatch !== 1}
              items={selectFieldOptions.touchPositionOpts}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.TouchPosEnum.enum.ON_PANEL,
                  fieldsToReset: ["touch_fixing_type"],
                },
                {
                  triggerValue: zodEnums.TouchPosEnum.enum.ON_DET_CAB,
                  fieldsToReset: ["touch_fixing_type"],
                },
              ]}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="touch_fixing_type"
              dataType="string"
              label="Fissaggio touch esterno"
              disabled={touchQtyWatch !== 2 && touchPosWatch !== "EXTERNAL"}
              items={selectFieldOptions.touchFixingTypeOpts}
            />
          </div>
        </div>
        <div className="fs-row">
          <div className="fs-item">
            <CheckboxField<ConfigSchema>
              name="has_itecoweb"
              label="Itecoweb"
              description={
                <>
                  <span>Comprensivo di:</span>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Dispositivo Itecoweb nel Q.E.</li>
                    <li>Lettore schede nel Q.E.</li>
                    <li>Programmatore schede da scrivania</li>
                  </ul>
                </>
              }
            />
          </div>
          <div className="fs-item">
            <CheckboxField<ConfigSchema>
              name="has_card_reader"
              label="Lettore schede"
              description="Senza Itecoweb"
            />
          </div>
          <div className="fs-item">
            <CheckboxField<ConfigSchema>
              name="is_fast"
              label="Portale fast"
              description={
                <>
                  <span>Comprensivo di:</span>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Barre supplementari di risciacquo</li>
                    <li>Semaforo posteriore</li>
                    <li>Bracci lunghi per fotocellule</li>
                    <li>Licenza piattaforma Itecoweb</li>
                  </ul>
                </>
              }
            />
          </div>
        </div>
        {(hasItecowebWatch || hasCardReaderWatch) && (
          <div className="fs-row">
            <div className="fs-item w-1/2 md:w-1/3">
              <SelectField<ConfigSchema>
                name="card_qty"
                dataType="number"
                label="Numero di schede"
                description="Numero di schede disponibili per la selezione dei programmi"
                items={selectFieldOptions.cardQtyOpts}
              />
            </div>
          </div>
        )}
      </div>
    </Fieldset>
  );
};

export default TouchSection;

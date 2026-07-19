"use client";

import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import { useDerivedFieldReset } from "@/hooks/use-derived-field-reset";
import { showCardQty as showCardQtyRule } from "@/lib/configuration/display-rules";
import { CONFIG_FIELD_LABELS } from "@/lib/configuration/field-labels";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";

const TouchSection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const touchQtyWatch = useWatch({ control, name: "touch_qty" });
  const touchPosWatch = useWatch({ control, name: "touch_pos" });
  const hasItecowebWatch = useWatch({ control, name: "has_itecoweb" });
  const hasCardReaderWatch = useWatch({ control, name: "has_card_reader" });

  const showCardQty = showCardQtyRule({
    has_itecoweb: hasItecowebWatch,
    has_card_reader: hasCardReaderWatch,
  });

  // Multi-field condition (both itecoweb AND card_reader off) — reset card_qty
  // when card_qty is hidden. Not expressible via single-field
  // fieldsToResetOnUncheck: each checkbox alone must not clear card_qty while
  // the other is still checked.
  useDerivedFieldReset<ConfigSchema>(!showCardQty, [
    { name: "card_qty", value: 0 },
  ]);

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
              label={CONFIG_FIELD_LABELS.touch_qty}
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
              label={CONFIG_FIELD_LABELS.touch_pos}
              disabled={touchQtyWatch !== 1}
              items={selectFieldOptions.touchPositionOpts}
              fieldsToResetOnValue={[
                {
                  triggerValue: [
                    zodEnums.TouchPosEnum.enum.ON_PANEL,
                    zodEnums.TouchPosEnum.enum.ON_DET_CAB,
                  ],
                  fieldsToReset: ["touch_fixing_type"],
                },
              ]}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="touch_fixing_type"
              dataType="string"
              label={CONFIG_FIELD_LABELS.touch_fixing_type}
              disabled={
                touchQtyWatch !== 2 &&
                touchPosWatch !== zodEnums.TouchPosEnum.enum.EXTERNAL
              }
              items={selectFieldOptions.touchFixingTypeOpts}
            />
          </div>
        </div>
        <div className="fs-row">
          <div className="fs-item">
            <CheckboxField<ConfigSchema>
              name="has_itecoweb"
              label={CONFIG_FIELD_LABELS.has_itecoweb}
              description={
                <>
                  <span className="mb-1 block">Comprensivo di:</span>
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
              label={CONFIG_FIELD_LABELS.has_card_reader}
              description="Senza Itecoweb"
            />
          </div>
          <div className="fs-item">
            <CheckboxField<ConfigSchema>
              name="is_fast"
              label={CONFIG_FIELD_LABELS.is_fast}
              description={
                <>
                  <span className="mb-1 block">Comprensivo di:</span>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Barre supplementari di risciacquo</li>
                    <li>Semaforo posteriore</li>
                    <li>Bracci lunghi per fotocellule</li>
                  </ul>
                </>
              }
            />
          </div>
        </div>
        <div className="fs-row">
          <div className="fs-item w-1/2 md:w-1/3">
            <SelectField<ConfigSchema>
              name="emergency_stop_qty"
              dataType="number"
              label={CONFIG_FIELD_LABELS.emergency_stop_qty}
              description="Posto sui montanti anteriori"
              items={selectFieldOptions.emergencyStopQtyOpts}
            />
          </div>
        </div>
        {showCardQty && (
          <div className="fs-row">
            <div className="fs-item w-1/2 md:w-1/3">
              <SelectField<ConfigSchema>
                name="card_qty"
                dataType="number"
                label={CONFIG_FIELD_LABELS.card_qty}
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

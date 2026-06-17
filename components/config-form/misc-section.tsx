import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import { showManualAntifreeze } from "@/lib/configuration/display-rules";
import { CONFIG_FIELD_LABELS } from "@/lib/configuration/field-labels";
import type { ConfigSchema } from "@/validation/config-schema";

const MiscSection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const hasChassisWashDetergentPumpWatch = useWatch({
    control,
    name: "has_chassis_wash_detergent_pump",
  });
  const hasAntifreezeWatch = useWatch({ control, name: "has_antifreeze" });

  const showManualAntifreezeField = showManualAntifreeze({
    has_chassis_wash_detergent_pump: hasChassisWashDetergentPumpWatch,
    has_antifreeze: hasAntifreezeWatch,
  });

  return (
    <Fieldset
      title="Varie"
      description="Opzioni aggiuntive della configurazione"
    >
      <div className="fs-content">
        <div>
          <CheckboxField<ConfigSchema>
            name="has_chassis_wash_detergent_pump"
            label={CONFIG_FIELD_LABELS.has_chassis_wash_detergent_pump}
            description="Tramite Dosatron in sala tecnica"
            fieldsToResetOnUncheck={[
              {
                fieldsToReset: ["has_chassis_wash_detergent_manual_antifreeze"],
                resetToValue: false,
              },
            ]}
          />
          {showManualAntifreezeField && (
            <div className="mt-3">
              <CheckboxField<ConfigSchema>
                name="has_chassis_wash_detergent_manual_antifreeze"
                label={
                  CONFIG_FIELD_LABELS.has_chassis_wash_detergent_manual_antifreeze
                }
              />
            </div>
          )}
        </div>
      </div>
    </Fieldset>
  );
};

export default MiscSection;

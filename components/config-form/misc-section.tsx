import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import type { ConfigSchema } from "@/validation/config-schema";

const MiscSection = () => {
  const { control } = useFormContext<ConfigSchema>();
  const hasChassisWashDetergentPumpWatch = useWatch({
    control,
    name: "has_chassis_wash_detergent_pump",
  });
  const hasAntifreezeWatch = useWatch({ control, name: "has_antifreeze" });

  return (
    <Fieldset
      title="Varie"
      description="Opzioni aggiuntive della configurazione"
    >
      <div className="fs-content">
        <div>
          <CheckboxField<ConfigSchema>
            name="has_chassis_wash_detergent_pump"
            label="Lavachassis con detergente"
            description="Tramite Dosatron in sala tecnica"
            fieldsToResetOnUncheck={[
              {
                fieldsToReset: ["has_chassis_wash_detergent_manual_antifreeze"],
                resetToValue: false,
              },
            ]}
          />
          {hasChassisWashDetergentPumpWatch && hasAntifreezeWatch && (
            <div className="mt-3">
              <CheckboxField<ConfigSchema>
                name="has_chassis_wash_detergent_manual_antifreeze"
                label="Antigelo manuale"
              />
            </div>
          )}
        </div>
      </div>
    </Fieldset>
  );
};

export default MiscSection;

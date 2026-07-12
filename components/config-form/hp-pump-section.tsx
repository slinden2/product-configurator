import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import {
  showChassisWashSensor as showChassisWashSensorRule,
  showChemicalRoofBar as showChemicalRoofBarRule,
} from "@/lib/configuration/display-rules";
import { CONFIG_FIELD_LABELS } from "@/lib/configuration/field-labels";
import { withNoSelection } from "@/lib/utils";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";

const HPPumpSection = () => {
  const { control, setValue } = useFormContext<ConfigSchema>();
  const has15kwPumpWatch = useWatch({ control, name: "has_15kw_pump" });
  const has30kwPumpWatch = useWatch({ control, name: "has_30kw_pump" });
  const has75kwPumpWatch = useWatch({ control, name: "has_75kw_pump" });
  const hasOMZPumpWatch = useWatch({ control, name: "has_omz_pump" });
  const omzPumpOutletWatch = useWatch({ control, name: "pump_outlet_omz" });
  const pumpOutlet1_15kw = useWatch({ control, name: "pump_outlet_1_15kw" });
  const pumpOutlet2_15kw = useWatch({ control, name: "pump_outlet_2_15kw" });
  const pumpOutlet1_30kw = useWatch({ control, name: "pump_outlet_1_30kw" });
  const pumpOutlet2_30kw = useWatch({ control, name: "pump_outlet_2_30kw" });
  const pumpOutlet1_75kw = useWatch({ control, name: "pump_outlet_1_75kw" });
  const pumpOutlet2_75kw = useWatch({ control, name: "pump_outlet_2_75kw" });

  const showChemicalRoofBar = showChemicalRoofBarRule({
    pump_outlet_omz: omzPumpOutletWatch,
  });

  const showChassisWashSensor = showChassisWashSensorRule({
    pump_outlet_1_15kw: pumpOutlet1_15kw,
    pump_outlet_2_15kw: pumpOutlet2_15kw,
    pump_outlet_1_30kw: pumpOutlet1_30kw,
    pump_outlet_2_30kw: pumpOutlet2_30kw,
    pump_outlet_1_75kw: pumpOutlet1_75kw,
    pump_outlet_2_75kw: pumpOutlet2_75kw,
  });

  useEffect(() => {
    if (!showChassisWashSensor) {
      setValue("chassis_wash_sensor_type", undefined, { shouldDirty: true });
      setValue("has_chassis_wash_plates", false, { shouldDirty: true });
    }
  }, [showChassisWashSensor, setValue]);

  return (
    <Fieldset
      title="Pompe HP"
      description="Seleziona le pompe alta pressione e le tipologie di uscite da includere nella configurazione"
    >
      <div className="space-y-6 md:space-y-3">
        <div className="fs-row">
          <div className="fs-item">
            <CheckboxField<ConfigSchema>
              name="has_75kw_pump"
              label={CONFIG_FIELD_LABELS.has_75kw_pump}
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: ["pump_outlet_1_75kw", "pump_outlet_2_75kw"],
                },
              ]}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="pump_outlet_1_75kw"
              dataType="string"
              label={CONFIG_FIELD_LABELS.pump_outlet_1_75kw}
              disabled={!has75kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet75kwTypes)}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="pump_outlet_2_75kw"
              dataType="string"
              label={CONFIG_FIELD_LABELS.pump_outlet_2_75kw}
              disabled={!has75kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet75kwTypes)}
            />
          </div>
        </div>
        <hr className="border-border" />
        <div className="fs-row">
          <div className="fs-item">
            <CheckboxField<ConfigSchema>
              name="has_15kw_pump"
              label={CONFIG_FIELD_LABELS.has_15kw_pump}
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: ["pump_outlet_1_15kw", "pump_outlet_2_15kw"],
                },
                {
                  fieldsToReset: ["has_15kw_pump_softstart"],
                  resetToValue: false,
                },
              ]}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="pump_outlet_1_15kw"
              dataType="string"
              label={CONFIG_FIELD_LABELS.pump_outlet_1_15kw}
              disabled={!has15kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet15kwTypes)}
            />
            {has15kwPumpWatch && (
              <div className="md:mt-2">
                <CheckboxField<ConfigSchema>
                  name="has_15kw_pump_softstart"
                  label={CONFIG_FIELD_LABELS.has_15kw_pump_softstart}
                />
              </div>
            )}
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="pump_outlet_2_15kw"
              dataType="string"
              label={CONFIG_FIELD_LABELS.pump_outlet_2_15kw}
              disabled={!has15kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet15kwTypes)}
            />
          </div>
        </div>
        <hr className="border-border" />
        <div className="fs-row">
          <div className="fs-item">
            <CheckboxField<ConfigSchema>
              name="has_30kw_pump"
              label={CONFIG_FIELD_LABELS.has_30kw_pump}
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: ["pump_outlet_1_30kw", "pump_outlet_2_30kw"],
                },
              ]}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="pump_outlet_1_30kw"
              dataType="string"
              label={CONFIG_FIELD_LABELS.pump_outlet_1_30kw}
              disabled={!has30kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet30kwTypes)}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="pump_outlet_2_30kw"
              dataType="string"
              label={CONFIG_FIELD_LABELS.pump_outlet_2_30kw}
              disabled={!has30kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet30kwTypes)}
            />
          </div>
        </div>
        <hr className="border-border" />
        <div className="fs-row">
          <div className="fs-item">
            <CheckboxField<ConfigSchema>
              name="has_omz_pump"
              label={CONFIG_FIELD_LABELS.has_omz_pump}
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: ["pump_outlet_omz"],
                },
                {
                  fieldsToReset: ["has_chemical_roof_bar"],
                  resetToValue: false,
                },
              ]}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="pump_outlet_omz"
              dataType="string"
              label={CONFIG_FIELD_LABELS.pump_outlet_omz}
              disabled={!hasOMZPumpWatch}
              items={selectFieldOptions.omzPumpOutletTypes}
              fieldsToResetOnValue={[
                {
                  triggerValue: zodEnums.OMZPumpOutletEnum.enum.SPINNERS,
                  fieldsToReset: ["has_chemical_roof_bar"],
                  resetToValue: false,
                },
              ]}
            />
            <div
              className={`md:mt-2 ${showChemicalRoofBar ? "" : "invisible"}`}
              aria-hidden={!showChemicalRoofBar}
            >
              <CheckboxField<ConfigSchema>
                name="has_chemical_roof_bar"
                label={CONFIG_FIELD_LABELS.has_chemical_roof_bar}
                disabled={!showChemicalRoofBar}
              />
            </div>
          </div>
          <div className="fs-item" />
        </div>
        {showChassisWashSensor && (
          <>
            <hr className="border-border" />
            <p className="text-sm font-medium">Accessori</p>
            <div className="fs-row">
              <div className="fs-item" />
              <div className="fs-item">
                <SelectField<ConfigSchema>
                  name="chassis_wash_sensor_type"
                  dataType="string"
                  label={CONFIG_FIELD_LABELS.chassis_wash_sensor_type}
                  items={withNoSelection(
                    selectFieldOptions.chassisWashSensorTypeOpts,
                  )}
                />
              </div>
              <div className="fs-item">
                <div className="md:pt-8">
                  <CheckboxField<ConfigSchema>
                    name="has_chassis_wash_plates"
                    label={CONFIG_FIELD_LABELS.has_chassis_wash_plates}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Fieldset>
  );
};

export default HPPumpSection;

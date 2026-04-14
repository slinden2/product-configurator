import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import { withNoSelection } from "@/lib/utils";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";
import { hasAnyChassisWashOutlet } from "@/validation/configuration/hp-pump-schema";

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

  const showChemicalRoofBar =
    omzPumpOutletWatch === zodEnums.OMZPumpOutletEnum.enum.HP_ROOF_BAR ||
    omzPumpOutletWatch === zodEnums.OMZPumpOutletEnum.enum.HP_ROOF_BAR_SPINNERS;

  const showChassisWashSensor = hasAnyChassisWashOutlet({
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
              label="Pompa 7.5kW"
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
              label="Uscita 1"
              disabled={!has75kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet75kwTypes)}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="pump_outlet_2_75kw"
              dataType="string"
              label="Uscita 2"
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
              label="Pompa 15kW"
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
              label="Uscita 1"
              disabled={!has15kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet15kwTypes)}
            />
            {has15kwPumpWatch && (
              <div className="md:mt-2">
                <CheckboxField<ConfigSchema>
                  name="has_15kw_pump_softstart"
                  label="Con softstart"
                />
              </div>
            )}
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="pump_outlet_2_15kw"
              dataType="string"
              label="Uscita 2"
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
              label="Pompa 30kW"
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
              label="Uscita 1"
              disabled={!has30kwPumpWatch}
              items={withNoSelection(selectFieldOptions.hpPumpOutlet30kwTypes)}
            />
          </div>
          <div className="fs-item">
            <SelectField<ConfigSchema>
              name="pump_outlet_2_30kw"
              dataType="string"
              label="Uscita 2"
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
              label="Pompa OMZ"
              fieldsToResetOnUncheck={[
                {
                  fieldsToReset: ["pump_outlet_omz"],
                  resetToValue: undefined,
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
              label="Uscita 1"
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
              className={`md:mt-2 ${
                showChemicalRoofBar ? "opacity-100" : "opacity-0"
              }`}
            >
              <CheckboxField<ConfigSchema>
                name="has_chemical_roof_bar"
                label="Con barra di prelavaggio"
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
                  label="Sensore ultrasuoni lavachassis"
                  items={withNoSelection(
                    selectFieldOptions.chassisWashSensorTypeOpts,
                  )}
                />
              </div>
              <div className="fs-item">
                <div className="md:pt-8">
                  <CheckboxField<ConfigSchema>
                    name="has_chassis_wash_plates"
                    label="Piastre lavachassis"
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

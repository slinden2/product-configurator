"use client";

import { Fragment, type ReactNode, useEffect } from "react";
import { type FieldPath, useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import Fieldset from "@/components/fieldset";
import SelectField from "@/components/select-field";
import {
  showChassisWashSensor as showChassisWashSensorRule,
  showChemicalRoofBar as showChemicalRoofBarRule,
} from "@/lib/configuration/display-rules";
import { CONFIG_FIELD_LABELS } from "@/lib/configuration/field-labels";
import { withNoSelection } from "@/lib/utils";
import type { SelectOption } from "@/types";
import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions, zodEnums } from "@/validation/configuration";

type LabeledFieldName = FieldPath<ConfigSchema> &
  keyof typeof CONFIG_FIELD_LABELS;

interface HpPumpRowProps {
  checkboxName: LabeledFieldName;
  outletNames: readonly [LabeledFieldName, LabeledFieldName];
  options: SelectOption[];
  extraUncheckResets?: Array<{
    fieldsToReset: Array<FieldPath<ConfigSchema>>;
    resetToValue?: unknown;
  }>;
  /** Rendered below the first outlet select while the pump is checked. */
  outlet1Extra?: ReactNode;
}

const HpPumpRow = ({
  checkboxName,
  outletNames,
  options,
  extraUncheckResets = [],
  outlet1Extra,
}: HpPumpRowProps) => {
  const { control } = useFormContext<ConfigSchema>();
  const hasPumpWatch = useWatch({ control, name: checkboxName });

  return (
    <div className="fs-row">
      <div className="fs-item">
        <CheckboxField<ConfigSchema>
          name={checkboxName}
          label={CONFIG_FIELD_LABELS[checkboxName]}
          fieldsToResetOnUncheck={[
            { fieldsToReset: [...outletNames] },
            ...extraUncheckResets,
          ]}
        />
      </div>
      <div className="fs-item">
        <SelectField<ConfigSchema>
          name={outletNames[0]}
          dataType="string"
          label={CONFIG_FIELD_LABELS[outletNames[0]]}
          disabled={!hasPumpWatch}
          items={withNoSelection(options)}
        />
        {hasPumpWatch && outlet1Extra && (
          <div className="md:mt-2">{outlet1Extra}</div>
        )}
      </div>
      <div className="fs-item">
        <SelectField<ConfigSchema>
          name={outletNames[1]}
          dataType="string"
          label={CONFIG_FIELD_LABELS[outletNames[1]]}
          disabled={!hasPumpWatch}
          items={withNoSelection(options)}
        />
      </div>
    </div>
  );
};

const hpPumpRows: HpPumpRowProps[] = [
  {
    checkboxName: "has_75kw_pump",
    outletNames: ["pump_outlet_1_75kw", "pump_outlet_2_75kw"],
    options: selectFieldOptions.hpPumpOutlet75kwTypes,
  },
  {
    checkboxName: "has_15kw_pump",
    outletNames: ["pump_outlet_1_15kw", "pump_outlet_2_15kw"],
    options: selectFieldOptions.hpPumpOutlet15kwTypes,
    extraUncheckResets: [
      { fieldsToReset: ["has_15kw_pump_softstart"], resetToValue: false },
    ],
    outlet1Extra: (
      <CheckboxField<ConfigSchema>
        name="has_15kw_pump_softstart"
        label={CONFIG_FIELD_LABELS.has_15kw_pump_softstart}
      />
    ),
  },
  {
    checkboxName: "has_30kw_pump",
    outletNames: ["pump_outlet_1_30kw", "pump_outlet_2_30kw"],
    options: selectFieldOptions.hpPumpOutlet30kwTypes,
  },
];

const HPPumpSection = () => {
  const { control, setValue } = useFormContext<ConfigSchema>();
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
        {hpPumpRows.map((row) => (
          <Fragment key={row.checkboxName}>
            <HpPumpRow {...row} />
            <hr className="border-border" />
          </Fragment>
        ))}
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

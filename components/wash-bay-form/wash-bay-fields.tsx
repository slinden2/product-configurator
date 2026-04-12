import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import SelectField from "@/components/select-field";
import { NOT_SELECTED_VALUE, withNoSelection } from "@/lib/utils";
import { getNumericSelectOptions } from "@/validation/common";
import { selectFieldOptions } from "@/validation/configuration";
import type { WashBaySchema } from "@/validation/wash-bay-schema";

interface WashBayFieldsProps {
  supplyType?: string;
}

const WashBayFields = ({ supplyType }: WashBayFieldsProps) => {
  const { control } = useFormContext<WashBaySchema>();
  const pressureWashTypeWatch = useWatch({
    control,
    name: "pressure_washer_type",
  });
  const hasGantryWatch = useWatch({ control, name: "has_gantry" });

  const showEnergyChainFields = hasGantryWatch && supplyType === "ENERGY_CHAIN";

  return (
    <div className="fs-content">
      <div className="fs-row">
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="hp_lance_qty"
            dataType="number"
            label="Numero lance HP"
            items={getNumericSelectOptions([0, 2])}
          />
        </div>
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="det_lance_qty"
            dataType="number"
            label={`Numero lance detergente`}
            items={getNumericSelectOptions([0, 2])}
          />
        </div>
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="hose_reel_qty"
            dataType="number"
            label="Numero avvolgitori"
            items={getNumericSelectOptions([0, 1, 2])}
          />
        </div>
      </div>
      <div className="fs-row">
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="pressure_washer_type"
            dataType="string"
            label="Tipo idropulitrice"
            items={withNoSelection(selectFieldOptions.pressureWasherOpts)}
            fieldsToResetOnValue={[
              {
                triggerValue: NOT_SELECTED_VALUE,
                fieldsToReset: ["pressure_washer_qty"],
              },
            ]}
          />
        </div>
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="pressure_washer_qty"
            dataType="number"
            label="Numero idropulitrici"
            disabled={!pressureWashTypeWatch}
            items={getNumericSelectOptions([1, 2, 3])}
          />
        </div>
      </div>
      <div className="fs-row">
        <div className="fs-item">
          <CheckboxField<WashBaySchema>
            name="has_gantry"
            label="Pista con portale"
            fieldsToResetOnUncheck={[
              {
                fieldsToReset: [
                  "energy_chain_width",
                  "has_shelf_extension",
                  "ec_profinet_cable_qty",
                  "ec_signal_cable_qty",
                  "ec_water_1_tube_qty",
                  "ec_water_34_tube_qty",
                  "ec_air_tube_qty",
                  "ec_r1_1_tube_qty",
                  "ec_r2_1_tube_qty",
                  "ec_r2_34_inox_tube_qty",
                ],
                resetToValue: undefined,
              },
            ]}
          />
        </div>
        <div className="fs-item">
          <CheckboxField<WashBaySchema>
            name="is_first_bay"
            label="Prima pista"
          />
        </div>
        <div className="fs-item">
          <CheckboxField<WashBaySchema>
            name="has_bay_dividers"
            label="Con pannellature"
          />
        </div>
      </div>
      {showEnergyChainFields && (
        <div className="border-t border-border pt-4 mt-2">
          <div className="fs-row md:items-end">
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="energy_chain_width"
                dataType="string"
                label="Larghezza catena"
                items={selectFieldOptions.cableChainWidths}
              />
            </div>
            <div className="fs-item">
              <CheckboxField<WashBaySchema>
                name="has_shelf_extension"
                label="Con prolunga per mensola alim."
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic my-4">
            Cavo Alimentazione 5G2,5 sempre incluso nella catena portacavi.
          </p>
          <div className="fs-row">
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_signal_cable_qty"
                dataType="number"
                label="Cavo segnali 12G1"
                items={getNumericSelectOptions([1, 2])}
              />
            </div>
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_profinet_cable_qty"
                dataType="number"
                label="Cavo Profinet"
                items={getNumericSelectOptions([0, 1])}
              />
            </div>
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_water_1_tube_qty"
                dataType="number"
                label={'Tubo acqua 1"'}
                items={getNumericSelectOptions([1, 2])}
              />
            </div>
          </div>
          <div className="fs-row">
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_water_34_tube_qty"
                dataType="number"
                label={'Tubo acqua 3/4"'}
                items={getNumericSelectOptions([0, 1, 2])}
              />
            </div>
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_r1_1_tube_qty"
                dataType="number"
                label={'Tubo R1 1"'}
                items={getNumericSelectOptions([0, 1, 2])}
              />
            </div>
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_r2_1_tube_qty"
                dataType="number"
                label={'Tubo R2 1"'}
                items={getNumericSelectOptions([0, 1, 2])}
              />
            </div>
          </div>
          <div className="fs-row">
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_r2_34_inox_tube_qty"
                dataType="number"
                label={'Tubo R2 3/4" INOX'}
                items={getNumericSelectOptions([0, 1, 2, 3])}
              />
            </div>
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_air_tube_qty"
                dataType="number"
                label="Tubo aria 8x17"
                items={getNumericSelectOptions([0, 1])}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WashBayFields;

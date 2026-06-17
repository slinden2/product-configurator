import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";
import SelectField from "@/components/select-field";
import InfoBanner from "@/components/shared/info-banner";
import {
  isWashBayEcWall,
  showWashBayEnergyChainFields,
  washBayHasHpSource,
} from "@/lib/configuration/display-rules";
import { WASH_BAY_FIELD_LABELS } from "@/lib/configuration/field-labels";
import { MSG } from "@/lib/messages";
import { NOT_SELECTED_VALUE, withNoSelection } from "@/lib/utils";
import { getNumericSelectOptions } from "@/validation/common";
import { selectFieldOptions } from "@/validation/configuration";
import type { WashBaySchema } from "@/validation/wash-bay-schema";

interface WashBayFieldsProps {
  supplyType?: string;
  supplyFixingType?: string;
}

const WashBayFields = ({
  supplyType,
  supplyFixingType,
}: WashBayFieldsProps) => {
  const { control, setValue } = useFormContext<WashBaySchema>();
  const pressureWashTypeWatch = useWatch({
    control,
    name: "pressure_washer_type",
  });
  const hasGantryWatch = useWatch({ control, name: "has_gantry" });

  const hpLanceQty = useWatch({ control, name: "hp_lance_qty" });
  const hoseReelHpWithPost = useWatch({
    control,
    name: "hose_reel_hp_with_post_qty",
  });
  const hoseReelHpWithoutPost = useWatch({
    control,
    name: "hose_reel_hp_without_post_qty",
  });
  const hoseReelHpDet = useWatch({
    control,
    name: "hose_reel_hp_det_with_post_qty",
  });

  const hasHpSource = washBayHasHpSource({
    hp_lance_qty: hpLanceQty,
    hose_reel_hp_with_post_qty: hoseReelHpWithPost,
    hose_reel_hp_without_post_qty: hoseReelHpWithoutPost,
    hose_reel_hp_det_with_post_qty: hoseReelHpDet,
  });

  useEffect(() => {
    if (!hasHpSource) {
      setValue("has_weeping_lances", false, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [hasHpSource, setValue]);

  const showEnergyChainFields = showWashBayEnergyChainFields(
    { has_gantry: hasGantryWatch },
    supplyType,
  );
  const isEcWall = isWashBayEcWall(supplyType, supplyFixingType);

  return (
    <div className="fs-content">
      {isEcWall && (
        <InfoBanner variant="warning" className="mb-4">
          {MSG.energyChainWall.washBayForm}
        </InfoBanner>
      )}
      <div className="fs-row">
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="hp_lance_qty"
            dataType="number"
            label={WASH_BAY_FIELD_LABELS.hp_lance_qty}
            disabled={isEcWall}
            items={getNumericSelectOptions([0, 2])}
          />
        </div>
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="det_lance_qty"
            dataType="number"
            label={WASH_BAY_FIELD_LABELS.det_lance_qty}
            disabled={isEcWall}
            items={getNumericSelectOptions([0, 2])}
          />
        </div>
      </div>
      <div className="fs-row">
        <div className="fs-item">
          <SelectField<WashBaySchema>
            name="pressure_washer_type"
            dataType="string"
            label={WASH_BAY_FIELD_LABELS.pressure_washer_type}
            disabled={isEcWall}
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
            label={WASH_BAY_FIELD_LABELS.pressure_washer_qty}
            disabled={isEcWall || !pressureWashTypeWatch}
            items={getNumericSelectOptions([1, 2, 3])}
          />
        </div>
      </div>
      <div className="fs-row">
        <div className="fs-item">
          <CheckboxField<WashBaySchema>
            name="has_gantry"
            label={WASH_BAY_FIELD_LABELS.has_gantry}
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
            label={WASH_BAY_FIELD_LABELS.is_first_bay}
            disabled={isEcWall}
          />
        </div>
        <div className="fs-item">
          <CheckboxField<WashBaySchema>
            name="has_bay_dividers"
            label={WASH_BAY_FIELD_LABELS.has_bay_dividers}
            disabled={isEcWall}
          />
        </div>
        <div className="fs-item">
          <CheckboxField<WashBaySchema>
            name="has_weeping_lances"
            label={WASH_BAY_FIELD_LABELS.has_weeping_lances}
            description="Solo per linee HP"
            disabled={isEcWall || !hasHpSource}
          />
        </div>
      </div>
      <div className="border-t border-border pt-4 mt-2">
        <h3 className="text-sm font-medium mb-3">Avvolgitori</h3>
        <div className="fs-row">
          <div className="fs-item">
            <SelectField<WashBaySchema>
              name="hose_reel_hp_with_post_qty"
              dataType="number"
              label={WASH_BAY_FIELD_LABELS.hose_reel_hp_with_post_qty}
              disabled={isEcWall}
              items={getNumericSelectOptions([0, 1, 2])}
            />
          </div>
          <div className="fs-item">
            <SelectField<WashBaySchema>
              name="hose_reel_hp_without_post_qty"
              dataType="number"
              label={WASH_BAY_FIELD_LABELS.hose_reel_hp_without_post_qty}
              disabled={isEcWall}
              items={getNumericSelectOptions([0, 1, 2])}
            />
          </div>
        </div>
        <div className="fs-row">
          <div className="fs-item">
            <SelectField<WashBaySchema>
              name="hose_reel_det_with_post_qty"
              dataType="number"
              label={WASH_BAY_FIELD_LABELS.hose_reel_det_with_post_qty}
              disabled={isEcWall}
              items={getNumericSelectOptions([0, 1, 2])}
            />
          </div>
          <div className="fs-item">
            <SelectField<WashBaySchema>
              name="hose_reel_det_without_post_qty"
              dataType="number"
              label={WASH_BAY_FIELD_LABELS.hose_reel_det_without_post_qty}
              disabled={isEcWall}
              items={getNumericSelectOptions([0, 1, 2])}
            />
          </div>
        </div>
        <div className="fs-row">
          <div className="fs-item">
            <SelectField<WashBaySchema>
              name="hose_reel_hp_det_with_post_qty"
              dataType="number"
              label={WASH_BAY_FIELD_LABELS.hose_reel_hp_det_with_post_qty}
              disabled={isEcWall}
              items={getNumericSelectOptions([0, 1, 2])}
            />
          </div>
        </div>
      </div>
      {showEnergyChainFields && (
        <div className="border-t border-border pt-4 mt-2">
          <h3 className="text-sm font-medium mb-3">Catenaria</h3>
          <div className="fs-row md:items-end">
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="energy_chain_width"
                dataType="string"
                label={WASH_BAY_FIELD_LABELS.energy_chain_width}
                items={selectFieldOptions.cableChainWidths}
              />
            </div>
            <div className="fs-item">
              <CheckboxField<WashBaySchema>
                name="has_shelf_extension"
                label={WASH_BAY_FIELD_LABELS.has_shelf_extension}
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
                label={WASH_BAY_FIELD_LABELS.ec_signal_cable_qty}
                items={getNumericSelectOptions([1, 2, 3])}
              />
            </div>
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_profinet_cable_qty"
                dataType="number"
                label={WASH_BAY_FIELD_LABELS.ec_profinet_cable_qty}
                items={getNumericSelectOptions([0, 1, 2])}
              />
            </div>
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_water_1_tube_qty"
                dataType="number"
                label={WASH_BAY_FIELD_LABELS.ec_water_1_tube_qty}
                items={getNumericSelectOptions([1, 2])}
              />
            </div>
          </div>
          <div className="fs-row">
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_water_34_tube_qty"
                dataType="number"
                label={WASH_BAY_FIELD_LABELS.ec_water_34_tube_qty}
                items={getNumericSelectOptions([0, 1, 2])}
              />
            </div>
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_r1_1_tube_qty"
                dataType="number"
                label={WASH_BAY_FIELD_LABELS.ec_r1_1_tube_qty}
                items={getNumericSelectOptions([0, 1, 2])}
              />
            </div>
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_r2_1_tube_qty"
                dataType="number"
                label={WASH_BAY_FIELD_LABELS.ec_r2_1_tube_qty}
                items={getNumericSelectOptions([0, 1, 2])}
              />
            </div>
          </div>
          <div className="fs-row">
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_r2_34_inox_tube_qty"
                dataType="number"
                label={WASH_BAY_FIELD_LABELS.ec_r2_34_inox_tube_qty}
                items={getNumericSelectOptions([0, 1, 2, 3])}
              />
            </div>
            <div className="fs-item">
              <SelectField<WashBaySchema>
                name="ec_air_tube_qty"
                dataType="number"
                label={WASH_BAY_FIELD_LABELS.ec_air_tube_qty}
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

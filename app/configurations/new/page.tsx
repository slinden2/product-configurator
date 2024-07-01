import ConfigForm from "@/components/ConfigForm";
import { ConfigFormData } from "@/components/ConfigForm";
import { zodEnums } from "@/validation/configuration";
import React from "react";

type ModifiedConfigFormData = {
  [K in keyof ConfigFormData]: ConfigFormData[K] extends number
    ? string
    : ConfigFormData[K];
};

const defaultTestValues: ModifiedConfigFormData = {
  name: "Nome Cliente",
  description: "Descrizione Impianto",
  brush_qty: "0",
  supply_type: zodEnums.SupplyTypeEnum.enum.STRAIGHT_SHELF,
  supply_fixing_type: zodEnums.SupplyFixingTypeEnum.enum.NONE,
  supply_side: zodEnums.SupplySideEnum.enum.TBD,
  water_1_type: zodEnums.WaterType1Enum.enum.NETWORK,
  has_antifreeze: false,
  rail_type: zodEnums.RailTypeEnum.enum.DOWELED,
  rail_length: "25",
  rail_guide_qty: "1",
  touch_qty: "1",
  touch_pos: zodEnums.TouchPosEnum.enum.INTERNAL,
  water_tanks: [
    {
      type: zodEnums.WaterTankTypeEnum.enum.L2500,
      inlet_w_float_qty: "1",
      inlet_no_float_qty: "0",
      outlet_w_valve_qty: "1",
      outlet_no_valve_qty: "0",
      has_blower: false,
    },
  ],
  wash_bays: [
    {
      hp_lance_qty: "2",
      det_lance_qty: "2",
      hose_reel_qty: "2",
      pressure_washer_type: zodEnums.PressureWasherTypeEnum.enum.L21_200BAR,
      pressure_washer_qty: "2",
      has_gantry: true,
      is_first_bay: true,
      has_bay_dividers: false,
    },
  ],
};

const NewConfiguration = () => {
  return <ConfigForm configuration={defaultTestValues} />;
};

export default NewConfiguration;

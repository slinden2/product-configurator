import { SelectOptionGroup } from "@/types";
import {
  BrushColorEnum,
  BrushTypeEnum,
  brushColors,
  brushNums,
  brushTypes,
} from "@/validation/configuration/brushSchema";
import {
  ChemicalPumpPosEnum,
  chemicalNum,
  chemicalPumpPositions,
} from "@/validation/configuration/chemPumpSchema";
import {
  HPPumpOutlet15kwEnum,
  hpPumpOutlet15kwTypes,
  HPPumpOutlet30kwEnum,
  hpPumpOutlet30kwTypes,
  OMZPumpOutletEnum,
  omzPumpOutletTypes,
} from "@/validation/configuration/hpPumpSchema";
import { inverterPumpOutletOpts } from "@/validation/configuration/invertPumpSchema";
import {
  TouchFixingType,
  TouchPosEnum,
  cardQtyOpts,
  touchFixingTypeOpts,
  touchQtyOpts,
  touchPositionOpts,
} from "@/validation/configuration/touchSchema";
import {
  RailTypeEnum,
  railGuideNum,
  railLengths,
  railTypes,
} from "@/validation/configuration/railSchema";
import {
  CableChainWidthEnum,
  SupplyFixingTypeEnum,
  SupplySideEnum,
  SupplyTypeEnum,
  cableChainWidths,
  supplyFixingTypes,
  supplySides,
  supplyTypes,
} from "@/validation/configuration/supplyTypeSchema";
import {
  PressureWasherTypeEnum,
  pressureWasherOpts,
} from "@/validation/configuration/washBaySchema";
import {
  WaterTypeEnum,
  WaterPump1Enum,
  waterPump1Opts,
  waterTypes,
  waterPump2Opts,
  WaterPump2Enum,
} from "@/validation/configuration/waterSupplySchema";
import {
  WaterTankTypeEnum,
  waterTankOpts,
} from "@/validation/configuration/waterTankSchema";

export const zodEnums = {
  BrushTypeEnum,
  BrushColorEnum,
  ChemicalPumpPosEnum,
  SupplyTypeEnum,
  CableChainWidthEnum,
  SupplyFixingTypeEnum,
  SupplySideEnum,
  WaterTypeEnum,
  WaterPump1Enum,
  WaterPump2Enum,
  RailTypeEnum,
  HPPumpOutlet15kwEnum,
  HPPumpOutlet30kwEnum,
  OMZPumpOutletEnum,
  TouchPosEnum,
  TouchFixingType,
  WaterTankTypeEnum,
  PressureWasherTypeEnum,
};

export const selectFieldOptions: SelectOptionGroup = {
  brushNums,
  brushTypes,
  brushColors,
  chemicalNum,
  chemicalPumpPositions,
  supplySides,
  supplyTypes,
  supplyFixingTypes,
  cableChainWidths,
  waterTypes,
  waterPump1Opts,
  waterPump2Opts,
  inverterPumpOutletOpts,
  railTypes,
  railLengths,
  railGuideNum,
  hpPumpOutlet15kwTypes,
  hpPumpOutlet30kwTypes,
  omzPumpOutletTypes,
  touchQtyOpts,
  touchPositionOpts,
  touchFixingTypeOpts,
  cardQtyOpts,
  waterTankOpts,
  pressureWasherOpts,
};

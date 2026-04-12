import type { SelectOptionGroup } from "@/types";
import {
  BrushColorEnum,
  BrushTypeEnum,
  brushColors,
  brushNums,
  brushTypes,
} from "@/validation/configuration/brush-schema";
import {
  ChemicalPumpPosEnum,
  chemicalNum,
  chemicalPumpPositions,
} from "@/validation/configuration/chem-pump-schema";
import {
  MachineTypeEnum,
  machineTypeOpts,
} from "@/validation/configuration/general-schema";
import {
  ChassisWashSensorTypeEnum,
  chassisWashSensorTypeOpts,
  HPPumpOutlet15kwEnum,
  HPPumpOutlet30kwEnum,
  hpPumpOutlet15kwTypes,
  hpPumpOutlet30kwTypes,
  OMZPumpOutletEnum,
  omzPumpOutletTypes,
} from "@/validation/configuration/hp-pump-schema";
import {
  AnchorTypeEnum,
  anchorTypes,
  RailTypeEnum,
  railGuideNum,
  railLengths,
  railTypes,
} from "@/validation/configuration/rail-schema";
import {
  CableChainWidthEnum,
  cableChainWidths,
  SupplyFixingTypeEnum,
  SupplySideEnum,
  SupplyTypeEnum,
  supplyFixingTypes,
  supplySides,
  supplyTypes,
} from "@/validation/configuration/supply-type-schema";
import {
  cardQtyOpts,
  emergencyStopQtyOpts,
  TouchFixingType,
  TouchPosEnum,
  touchFixingTypeOpts,
  touchPositionOpts,
  touchQtyOpts,
} from "@/validation/configuration/touch-schema";
import {
  inverterPumpOutletOpts,
  WaterPump1Enum,
  WaterPump2Enum,
  WaterTypeEnum,
  waterPump1Opts,
  waterPump2Opts,
  waterTypes,
} from "@/validation/configuration/water-supply-schema";
import {
  PressureWasherTypeEnum,
  pressureWasherOpts,
} from "@/validation/wash-bay-schema";
import { waterTankOpts } from "@/validation/water-tank-schema";

export const zodEnums = {
  MachineTypeEnum,
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
  AnchorTypeEnum,
  RailTypeEnum,
  ChassisWashSensorTypeEnum,
  HPPumpOutlet15kwEnum,
  HPPumpOutlet30kwEnum,
  OMZPumpOutletEnum,
  TouchPosEnum,
  TouchFixingType,
  PressureWasherTypeEnum,
};

export const selectFieldOptions: SelectOptionGroup = {
  machineTypeOpts,
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
  anchorTypes,
  hpPumpOutlet15kwTypes,
  hpPumpOutlet30kwTypes,
  omzPumpOutletTypes,
  chassisWashSensorTypeOpts,
  touchQtyOpts,
  touchPositionOpts,
  touchFixingTypeOpts,
  cardQtyOpts,
  emergencyStopQtyOpts,
  pressureWasherOpts,
  waterTankOpts,
};

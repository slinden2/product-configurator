import { SelectOptionGroup } from "@/types";
import {
  MachineTypeEnum,
  machineTypeOpts,
} from "@/validation/configuration/general-schema";
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
  ChassisWashSensorTypeEnum,
  chassisWashSensorTypeOpts,
  HPPumpOutlet15kwEnum,
  hpPumpOutlet15kwTypes,
  HPPumpOutlet30kwEnum,
  hpPumpOutlet30kwTypes,
  OMZPumpOutletEnum,
  omzPumpOutletTypes,
} from "@/validation/configuration/hp-pump-schema";
import {
  TouchFixingType,
  TouchPosEnum,
  cardQtyOpts,
  touchFixingTypeOpts,
  touchQtyOpts,
  touchPositionOpts,
} from "@/validation/configuration/touch-schema";
import {
  DowelTypeEnum,
  RailTypeEnum,
  dowelTypes,
  railGuideNum,
  railLengths,
  railTypes,
} from "@/validation/configuration/rail-schema";
import {
  CableChainWidthEnum,
  SupplyFixingTypeEnum,
  SupplySideEnum,
  SupplyTypeEnum,
  cableChainWidths,
  supplyFixingTypes,
  supplySides,
  supplyTypes,
} from "@/validation/configuration/supply-type-schema";
import {
  PressureWasherTypeEnum,
  pressureWasherOpts,
} from "@/validation/wash-bay-schema";
import {
  WaterTypeEnum,
  WaterPump1Enum,
  waterPump1Opts,
  waterTypes,
  waterPump2Opts,
  WaterPump2Enum,
  inverterPumpOutletOpts,
} from "@/validation/configuration/water-supply-schema";
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
  DowelTypeEnum,
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
  dowelTypes,
  hpPumpOutlet15kwTypes,
  hpPumpOutlet30kwTypes,
  omzPumpOutletTypes,
  chassisWashSensorTypeOpts,
  touchQtyOpts,
  touchPositionOpts,
  touchFixingTypeOpts,
  cardQtyOpts,
  pressureWasherOpts,
  waterTankOpts,
};

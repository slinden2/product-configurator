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
import {
  ExtPanelFixingType,
  PanelNumEnum,
  PanelPosEnum,
  cardQtyOpts,
  extPanelFixingTypes,
  panelNums,
  panelPositions,
} from "@/validation/configuration/panelSchema";
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
  WaterType1Enum,
  WaterType2Enum,
  WaterPump1Enum,
  waterPump1Opts,
  waterTypes1,
  waterTypes2,
  waterPump2Opts,
  WaterPump2Enum,
} from "@/validation/configuration/waterSupplySchema";

export const zodEnums = {
  BrushTypeEnum,
  BrushColorEnum,
  ChemicalPumpPosEnum,
  SupplyTypeEnum,
  CableChainWidthEnum,
  SupplyFixingTypeEnum,
  SupplySideEnum,
  WaterType1Enum,
  WaterType2Enum,
  WaterPump1Enum,
  WaterPump2Enum,
  RailTypeEnum,
  HPPumpOutlet15kwEnum,
  HPPumpOutlet30kwEnum,
  OMZPumpOutletEnum,
  PanelNumEnum,
  PanelPosEnum,
  ExtPanelFixingType,
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
  waterTypes1,
  waterTypes2,
  waterPump1Opts,
  waterPump2Opts,
  railTypes,
  railLengths,
  railGuideNum,
  hpPumpOutlet15kwTypes,
  hpPumpOutlet30kwTypes,
  omzPumpOutletTypes,
  panelNums,
  panelPositions,
  extPanelFixingTypes,
  cardQtyOpts,
};

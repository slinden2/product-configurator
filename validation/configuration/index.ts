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
  ExtPanelFixingType,
  PanelNumEnum,
  PanelPosEnum,
  extPanelFixingTypes,
  panelNums,
  panelPositions,
} from "@/validation/configuration/panelSchema";
import {
  RailTypeEnum,
  railGuideNum,
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
  BoosterPumpEnum,
  boosterPumps,
  waterTypes1,
  waterTypes2,
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
  BoosterPumpEnum,
  RailTypeEnum,
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
  boosterPumps,
  railTypes,
  railGuideNum,
  panelNums,
  panelPositions,
  extPanelFixingTypes,
};

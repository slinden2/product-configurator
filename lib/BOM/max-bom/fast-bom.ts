import { Configuration } from "@/db/schemas";
import { MaxBOMItem } from "@/lib/BOM/max-bom";

const PART_NUMBERS: Record<string, string> = {
  ADDITIONAL_LATERAL_RINSE_BARS: "450.65.000",
  ADDITIONAL_RINSE_ARCH: "450.65.002",
  LONG_PHOTOCELL_SUPPORTS: "926.03.000",
  POSTERIOR_TRAFFIC_LIGHTS: "926.01.000",
};

const isFast = (config: Configuration): boolean => config.is_fast;

export const fastBOM: MaxBOMItem<Configuration>[] = [
  {
    pn: PART_NUMBERS.ADDITIONAL_LATERAL_RINSE_BARS,
    conditions: [isFast, (config) => config.brush_qty === 2],
    qty: 1,
    _description: "Additional lateral rinse bars",
  },
  {
    pn: PART_NUMBERS.ADDITIONAL_RINSE_ARCH,
    conditions: [isFast, (config) => config.brush_qty === 3],
    qty: 1,
    _description: "Additional rinse arch",
  },
  {
    pn: PART_NUMBERS.LONG_PHOTOCELL_SUPPORTS,
    conditions: [isFast],
    qty: 1,
    _description: "Long photocell supports",
  },
  {
    pn: PART_NUMBERS.POSTERIOR_TRAFFIC_LIGHTS,
    conditions: [isFast],
    qty: 1,
    _description: "Posterior traffic lights",
  },
];

import { z } from "zod";
import { updateConfigSchema } from "@/validation/config-schema";
import { updateWashBaySchema } from "@/validation/wash-bay-schema";
import { updateWaterTankSchema } from "@/validation/water-tank-schema";

/**
 * Shape of the full config-as-sold state captured on the offer snapshot at the
 * SALES_APPROVED freeze. It mirrors the form-shaped output of
 * `loadValidatedConfiguration` so the read-only "as-sold" view can feed it
 * straight into `ConfigView` with no extra transformation.
 */
export const offerConfigSnapshotSchema = z.object({
  configuration: updateConfigSchema,
  waterTanks: z.array(updateWaterTankSchema),
  washBays: z.array(updateWashBaySchema),
});

export type OfferConfigSnapshot = z.infer<typeof offerConfigSnapshotSchema>;

import type { z } from "zod";
import type { updateConfigSchema } from "@/validation/config-schema";
import type { updateWashBaySchema } from "@/validation/wash-bay-schema";
import type { updateWaterTankSchema } from "@/validation/water-tank-schema";

/**
 * Shape of the full config-as-sold state captured on the offer snapshot at the
 * SALES_APPROVED freeze. It mirrors the form-shaped output of
 * `loadValidatedConfiguration` so the read-only "as-sold" view can feed it
 * straight into `ConfigView` with no extra transformation.
 *
 * Type-only by design: this composes `updateConfigSchema` and its live
 * business-rule superRefines, so a runtime `.parse()` on a frozen snapshot
 * would crash on data that was valid when frozen. Stored as-sold snapshots must
 * be read through the lenient `parseAsSoldSnapshot`
 * (`lib/configuration/build-as-sold-diff.ts`) — never re-validated here.
 */
export type OfferConfigSnapshot = {
  configuration: z.infer<typeof updateConfigSchema>;
  waterTanks: z.infer<typeof updateWaterTankSchema>[];
  washBays: z.infer<typeof updateWashBaySchema>[];
};

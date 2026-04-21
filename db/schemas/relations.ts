import { relations } from "drizzle-orm";
import { activityLogs } from "@/db/schemas/activity-logs";
import { bomLines } from "@/db/schemas/bom-lines";
import { configurations } from "@/db/schemas/configurations";
import { engineeringBomItems } from "@/db/schemas/engineering-bom-items";
import { partNumbers } from "@/db/schemas/part-numbers";
import { priceCoefficients } from "@/db/schemas/price-coefficients";
import { userProfiles } from "@/db/schemas/user-profiles";
import { washBays } from "@/db/schemas/wash-bays";
import { waterTanks } from "@/db/schemas/water-tanks";

export const configurationsRelations = relations(
  configurations,
  ({ many, one }) => ({
    user: one(userProfiles, {
      fields: [configurations.user_id],
      references: [userProfiles.id],
    }),
    water_tanks: many(waterTanks),
    wash_bays: many(washBays),
    engineering_bom_items: many(engineeringBomItems),
  }),
);

export const engineeringBomItemsRelations = relations(
  engineeringBomItems,
  ({ one }) => ({
    configuration: one(configurations, {
      fields: [engineeringBomItems.configuration_id],
      references: [configurations.id],
    }),
  }),
);

export const washBaysRelations = relations(washBays, ({ one }) => ({
  configuration: one(configurations, {
    fields: [washBays.configuration_id],
    references: [configurations.id],
  }),
}));

export const waterTanksRelations = relations(waterTanks, ({ one }) => ({
  configuration: one(configurations, {
    fields: [waterTanks.configuration_id],
    references: [configurations.id],
  }),
}));

export const usersProfilesRelations = relations(userProfiles, ({ many }) => ({
  configurations: many(configurations),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(userProfiles, {
    fields: [activityLogs.user_id],
    references: [userProfiles.id],
  }),
}));

export const partNumbersRelations = relations(partNumbers, ({ many }) => ({
  bom_lines_as_parent: many(bomLines, { relationName: "bom_line_parent" }),
  bom_lines_as_child: many(bomLines, { relationName: "bom_line_child" }),
}));

export const priceCoefficientsRelations = relations(
  priceCoefficients,
  ({ one }) => ({
    updater: one(userProfiles, {
      fields: [priceCoefficients.updated_by],
      references: [userProfiles.id],
    }),
  }),
);

export const bomLinesRelations = relations(bomLines, ({ one }) => ({
  parent: one(partNumbers, {
    fields: [bomLines.parent_pn],
    references: [partNumbers.pn],
    relationName: "bom_line_parent",
  }),
  child: one(partNumbers, {
    fields: [bomLines.child_pn],
    references: [partNumbers.pn],
    relationName: "bom_line_child",
  }),
}));

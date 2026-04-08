import { relations } from "drizzle-orm";
import { activityLogs } from "@/db/schemas/activity-logs";
import { configurations } from "@/db/schemas/configurations";
import { engineeringBomItems } from "@/db/schemas/engineering-bom-items";
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

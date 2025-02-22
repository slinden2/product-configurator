import { relations } from "drizzle-orm/relations";
import { configurations, waterTanks, washBays } from "./schema";

export const waterTanksRelations = relations(waterTanks, ({one}) => ({
	configuration: one(configurations, {
		fields: [waterTanks.configurationId],
		references: [configurations.id]
	}),
}));

export const configurationsRelations = relations(configurations, ({many}) => ({
	waterTanks: many(waterTanks),
	washBays: many(washBays),
}));

export const washBaysRelations = relations(washBays, ({one}) => ({
	configuration: one(configurations, {
		fields: [washBays.configurationId],
		references: [configurations.id]
	}),
}));
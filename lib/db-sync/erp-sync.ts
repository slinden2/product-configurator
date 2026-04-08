export {};

process.loadEnvFile(".env.local");
const { batchUpsert } = await import("./sync-logic.js");
await batchUpsert();

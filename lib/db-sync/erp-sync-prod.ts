export {};

process.loadEnvFile(".env.production");
const { batchUpsert } = await import("./sync-logic.js");
await batchUpsert();

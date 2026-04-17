export {};

process.loadEnvFile(".env.production");
const { batchUpsertPartNumbers, batchUpsertBomStructure } = await import(
  "./sync-logic.js"
);
await batchUpsertPartNumbers();
await batchUpsertBomStructure();

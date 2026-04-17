export {};

process.loadEnvFile(".env.local");
const { batchUpsertPartNumbers, batchUpsertBomStructure } = await import(
  "./sync-logic.js"
);
await batchUpsertPartNumbers();
await batchUpsertBomStructure();

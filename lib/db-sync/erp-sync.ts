export {};

// Env file path is optional and defaults to .env.local.
// For the production sync, pass .env.production as the first argument.
const envFile = process.argv[2] ?? ".env.local";
process.loadEnvFile(envFile);

const { batchUpsertPartNumbers, batchUpsertBomStructure } = await import(
  "./sync-logic.js"
);
await batchUpsertPartNumbers();
await batchUpsertBomStructure();

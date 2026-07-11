import type { db } from "@/db";

export type DatabaseType = typeof db;
export type TransactionType = Parameters<
  Parameters<DatabaseType["transaction"]>[0]
>[0];

export class QueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryError";

    Object.setPrototypeOf(this, QueryError.prototype);
  }
}

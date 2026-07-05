import type { db } from "@/db";

export type DatabaseType = typeof db;
export type TransactionType = Parameters<
  Parameters<DatabaseType["transaction"]>[0]
>[0];

export class QueryError extends Error {
  errorCode: number;

  constructor(message: string, errorCode: number) {
    super(message);
    this.name = "QueryError";
    this.errorCode = errorCode;

    Object.setPrototypeOf(this, QueryError.prototype);
  }
}

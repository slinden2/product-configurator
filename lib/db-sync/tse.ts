import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sql, { type ConnectionPool } from "mssql";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const user = process.env.TSE_USER;
const password = process.env.TSE_PW;
const server = process.env.TSE_SRV;
const database = process.env.TSE_DB_NAME;

if (!user || !password || !server || !database) {
  throw new Error(
    "Missing required environment variables: TSE_USER, TSE_PW, TSE_SRV, TSE_DB_NAME",
  );
}

const config = {
  user,
  password,
  server,
  database,
  options: {
    trustServerCertificate: true,
  },
};

export interface DBData {
  pn: string;
  description: string;
  pn_type: 1 | 2;
  is_phantom: 0 | 1;
  cost: number | null;
}

// biome-ignore lint/suspicious/noExplicitAny: type guard requires any for runtime validation
function isDBDataArray(array: any[]): array is DBData[] {
  return array.every(
    (item) =>
      typeof item.pn === "string" &&
      typeof item.description === "string" &&
      (item.pn_type === 1 || item.pn_type === 2) &&
      (item.is_phantom === 0 || item.is_phantom === 1) &&
      (typeof item.cost === "number" || item.cost === null),
  );
}

export const fetchPartNumbersFromTSE = async (): Promise<DBData[]> => {
  let conn: ConnectionPool | undefined;
  let data: DBData[] = [];

  try {
    conn = await sql.connect(config);

    const fetchPartNumbersQuery = fs.readFileSync(
      path.join(__dirname, "fetch-part-numbers-query.sql"),
      "utf8",
    );
    const result = await sql.query(fetchPartNumbersQuery);

    data = isDBDataArray(result.recordset) ? result.recordset : [];
  } catch (err) {
    console.error("Error fetching part numbers from TSE:", err);
    throw err;
  } finally {
    if (conn) {
      await conn.close();
    }
  }

  return data;
};

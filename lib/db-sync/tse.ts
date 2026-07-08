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
    trustServerCertificate: process.env.NODE_ENV !== "production",
  },
};

export interface DBData {
  pn: string;
  description: string;
  pn_type: 1 | 2;
  is_phantom: 0 | 1;
  cost: number | null;
  is_subcontract: 0 | 1;
  family: string | null;
  sub_family: string | null;
}

// biome-ignore lint/suspicious/noExplicitAny: type guard requires any for runtime validation
function isDBData(item: any): item is DBData {
  return (
    typeof item.pn === "string" &&
    typeof item.description === "string" &&
    (item.pn_type === 1 || item.pn_type === 2) &&
    (item.is_phantom === 0 || item.is_phantom === 1) &&
    (typeof item.cost === "number" || item.cost === null) &&
    (item.is_subcontract === 0 || item.is_subcontract === 1) &&
    (typeof item.family === "string" || item.family === null) &&
    (typeof item.sub_family === "string" || item.sub_family === null)
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

    const offending = result.recordset.find((item) => !isDBData(item));
    if (offending) {
      throw new Error(
        `TSE part-number rows failed validation — possible ERP schema drift. Sample offending row: ${JSON.stringify(offending)}`,
      );
    }
    data = result.recordset as DBData[];
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

export interface BomStructureRow {
  parent_pn: string;
  child_pn: string;
  qty: number;
  sort_order: number;
}

// biome-ignore lint/suspicious/noExplicitAny: type guard requires any for runtime validation
function isBomStructureRow(item: any): item is BomStructureRow {
  return (
    typeof item.parent_pn === "string" &&
    typeof item.child_pn === "string" &&
    typeof item.qty === "number" &&
    typeof item.sort_order === "number"
  );
}

export const fetchBomStructureFromTSE = async (): Promise<
  BomStructureRow[]
> => {
  let conn: ConnectionPool | undefined;
  let data: BomStructureRow[] = [];

  try {
    conn = await sql.connect(config);

    const query = fs.readFileSync(
      path.join(__dirname, "fetch-bom-structure-query.sql"),
      "utf8",
    );
    const result = await sql.query(query);

    const offending = result.recordset.find((item) => !isBomStructureRow(item));
    if (offending) {
      throw new Error(
        `TSE BOM-structure rows failed validation — possible ERP schema drift. Sample offending row: ${JSON.stringify(offending)}`,
      );
    }
    data = result.recordset as BomStructureRow[];
  } catch (err) {
    console.error("Error fetching BOM structure from TSE:", err);
    throw err;
  } finally {
    if (conn) {
      await conn.close();
    }
  }

  return data;
};

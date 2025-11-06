import "dotenv/config";
import sql, { ConnectionPool } from "mssql";
// import "../../envConfig";
import fs from 'fs';

const user = process.env.TSE_USER; // SQL Server username
const password = process.env.TSE_PW; // SQL Server password
const server = process.env.TSE_SRV; // SQL Server host, use IP address if necessary
const database = process.env.TSE_DB_NAME; // Database name

if (!user || !password || !server || !database) {
  throw new Error(
    "Missing required environment variables: TSE_USER, TSE_PW, TSE_SRV, TSE_DB_NAME"
  );
}

// Define the configuration for your database connection
const config = {
  user,
  password,
  server,
  database,
  options: {
    trustServerCertificate: true, // Set to true for local dev environments
  },
};

let conn: ConnectionPool | undefined;

export interface DBData {
  pn: string;
  description: string;
  pn_type: 1 | 2;
  is_phantom: 0 | 1;
  cost: number | null;
}

function isDBDataArray(array: any[]): array is DBData[] {
  return array.every(item =>
    typeof item.pn === 'string' &&
    typeof item.description === 'string' &&
    (item.pn_type === 1 || item.pn_type === 2) &&
    (item.is_phantom === 0 || item.is_phantom === 1) &&
    typeof item.cost === 'number' || item.cost === null
  );
}

export const fetchPartNumbersFromTSE = async (): Promise<
  DBData[] | undefined
> => {
  let data: DBData[] = [];
  try {
    conn = await sql.connect(config);

    const fetchPartNumbersQuery = fs.readFileSync('./lib/db-sync/fetch-part-numbers-query.sql', 'utf8');
    const result = await sql.query(fetchPartNumbersQuery);

    data = isDBDataArray(result.recordset) ? result.recordset : [];

  } catch (err) {
    console.error("Error connecting to the database:", err);
  } finally {
    if (conn) {
      await conn.close();
      return data;
    }
  }
};
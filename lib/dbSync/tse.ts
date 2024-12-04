import sql, { ConnectionPool } from "mssql";
import "../../envConfig";
import { PartNumber } from "@prisma/client";

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

export const fetchPartNumbersFromTSE = async (): Promise<
  PartNumber[] | undefined
> => {
  let data: PartNumber[] = [];
  try {
    conn = await sql.connect(config);

    const result = await sql.query`SELECT
    t1.MG66_CODART AS pn, 
    t2.MG87_DESCART AS description
FROM 
    MG66_ANAGRART AS t1
INNER JOIN 
    MG87_ARTDESC AS t2 
ON 
    t1.MG66_CODART = t2.MG87_CODART_MG66
WHERE 
    (t2.MG87_LINGUA_MG52 IS NULL OR t2.MG87_LINGUA_MG52 = '') AND (MG87_OPZIONE_MG5E IS NULL OR MG87_OPZIONE_MG5E = '')`;

    data = result.recordset;
  } catch (err) {
    console.error("Error connecting to the database:", err);
  } finally {
    if (conn) {
      await conn.close();
      return data;
    }
  }
};

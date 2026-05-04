import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function createSslConfig() {
  if (process.env.PGSSLROOTCERT) {
    return { ca: fs.readFileSync(process.env.PGSSLROOTCERT, "utf8") };
  }

  return undefined;
}

function createConnectionString() {
  const sslConfig = createSslConfig();
  if (!sslConfig) return process.env.DATABASE_URL;

  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");
  return url.toString();
}

export const pool = new Pool({
  connectionString: createConnectionString(),
  ssl: createSslConfig(),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
export { ratingsTable } from "./schema/ratings";

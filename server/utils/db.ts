import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../database/schema';

const isBuild = process.env.NITRO_PRERENDER === 'true';
const connectionString = process.env.POSTGRES_URL || 'postgresql://hadith_readonly:dummy@localhost:5432/hadith';

if (!process.env.POSTGRES_URL && !isBuild) {
  throw new Error('POSTGRES_URL environment variable is not defined.');
}

const client = postgres(connectionString, {
  max: isBuild ? 1 : 10,
  idle_timeout: isBuild ? 1 : 20,
  connect_timeout: isBuild ? 1 : 10
});

export const db = drizzle(client, { schema });
export { schema };
export type Database = typeof db;
export type SchemaType = typeof schema;

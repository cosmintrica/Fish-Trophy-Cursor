import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../packages/db/schema';

// Configure database connection
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export * from '../packages/db/schema';

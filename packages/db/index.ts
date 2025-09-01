export * from './schema';

// Database connection
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Configure database connection
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

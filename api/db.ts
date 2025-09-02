import { neon } from '@netlify/neon';
import * as schema from './schema';

// Configure database connection using Netlify Neon integration
const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

// Export schema for use in API routes
export * from './schema';

// Export the sql instance for direct queries
export { sql };

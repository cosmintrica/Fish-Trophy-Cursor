import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './api/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
});

import { defineConfig } from 'drizzle-kit';

// Local SQLite config
// This is used for local development and testing
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DB_URL!,
    authToken: process.env.DB_TOKEN!,
  }
});

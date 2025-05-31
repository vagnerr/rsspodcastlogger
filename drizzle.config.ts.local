import { defineConfig } from 'drizzle-kit';

// Local SQLite config
// This is used for local development and testing
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./local.db'
  }
});

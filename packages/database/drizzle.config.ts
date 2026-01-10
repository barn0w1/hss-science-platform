import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';
import path from 'node:path';

// Drizzle Kit runs outside the app context, so we might need to load .env manually here
// or use the one from config if it supports it.
// Simpler to just load .env directly for CLI tools, but let's try to use the var.
// Since @hss/config uses dotenv internally, importing it might work if we are in the right context,
// but CLI tools are tricky. Let's rely on process.env populated by our standard loading.

config({ path: path.resolve(process.cwd(), '../../.env') });

if (!process.env.HSS_DATABASE_URL) {
  throw new Error("HSS_DATABASE_URL is missing");
}

export default defineConfig({
  schema: "./src/schema",
  out: "./drizzle",
  
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.HSS_DATABASE_URL,
  },

  verbose: true,
  strict: true, 
});
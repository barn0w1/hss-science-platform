import { defineConfig } from "drizzle-kit";

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
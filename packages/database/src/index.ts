import { drizzle } from "drizzle-orm/postgres-js";
import { queryClient } from "./client.js";

// Import all schemas
import * as coreSchema from "./schema/core.js";
import * as storageSchema from "./schema/storage.js";

// Merge schemas for Drizzle type inference
export const schema = {
  ...coreSchema,
  ...storageSchema,
};

// Initialize Drizzle instance
export const db = drizzle(queryClient, { schema });

// Export schemas so apps can import them like:
// import { users, nodes } from "@hss/database";
export * from "./schema/core.js";
export * from "./schema/storage.js";
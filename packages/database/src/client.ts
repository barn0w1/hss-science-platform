import postgres from "postgres";
import { env } from "@hss/config";

const connectionString = env.HSS_DATABASE_URL;

if (!connectionString) {
  throw new Error("HSS_DATABASE_URL is missing in environment variables.");
}

// Create a connection pool
// max: 10 is sufficient for standard usage within a container
export const queryClient = postgres(connectionString, { max: 10 });

// For migration scripts, we might need a single connection (handled separately)
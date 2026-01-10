import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { config } from 'dotenv';
import path from 'node:path';

// Load .env explicitly for migration script
config({ path: path.resolve(process.cwd(), '../../.env') });

const connectionString = process.env.HSS_DATABASE_URL;
if (!connectionString) {
  throw new Error("HSS_DATABASE_URL is missing");
}

const runMigrate = async () => {
  console.log("Starting migration...");

  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  await migrate(db, { migrationsFolder: "drizzle" });

  console.log("Migration completed successfully!");

  // 接続を閉じる（これをしないとスクリプトが終わらない）
  await migrationClient.end();
};

runMigrate().catch((err) => {
  console.error("Migration failed!");
  console.error(err);
  process.exit(1);
});
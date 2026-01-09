import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Core
 */

// Users
export const users = pgTable("users", {
  // uuid
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Discord ID
  discordId: text("discord_id").notNull().unique(),

  // Profile information
  username: text("username").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),

  // Role (e.g., admin, user)
  role: text("role"),

  // timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
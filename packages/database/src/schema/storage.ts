import { pgTable, text, timestamp, boolean, bigint, uuid, integer, index } from "drizzle-orm/pg-core";
import { users } from "./core";

/**
 * Storage System
 */

// Spaces
export const spaces = pgTable("spaces", {
  // uuid
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Display name of the drive
  name: text("name")
    .notNull(),

  // Storage limit (bytes)
  quotaBytes: bigint("quota_bytes", { mode: "number" })
    .default(10 * 1024 * 1024 * 1024)
    .notNull(),

  // Owner
  ownerId: text("owner_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});


// Blobs
export const blobs = pgTable("blobs", {
  // SHA256 Hash
  hash: text("hash").primaryKey(),

  // File size in bytes
  size: bigint("size", { mode: "number" }).notNull(),

  // MIME type for preview
  mimeType: text("mime_type").notNull(),

  // Garbage Collection: Deleted from R2 when refCount hits 0
  refCount: integer("ref_count").default(0).notNull(),

  // "pending": Uploading / "ready": Verified & stored in R2
  status: text("status", { enum: ["pending", "ready"] })
    .default("pending")
    .notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// 3. Nodes
// Logical file system structure (Trees)
export const nodes = pgTable("nodes", {
  // uuid
  id: uuid("id").defaultRandom().primaryKey(),

  // Hierarchy
  spaceId: text("space_id").references(() => spaces.id, { onDelete: "cascade" }).notNull(),
  parentId: uuid("parent_id").references((): any => nodes.id, { onDelete: "cascade" }),

  // Metadata
  name: text("name").notNull(),
  type: text("type", { enum: ["file", "folder"] }).notNull(),

  // Content Link (Files only, null for folders)
  blobHash: text("blob_hash").references(() => blobs.hash),

  // Permissions & State
  ownerId: text("owner_id").references(() => users.id).notNull(),
  isTrashed: boolean("is_trashed").default(false).notNull(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (t) => ({
  // Indexes for fast directory listing
  parentIdx: index("node_parent_idx").on(t.parentId),
  spaceIdx: index("node_space_idx").on(t.spaceId),
}));


// 4. Upload Sessions
// Tracks direct-to-R2 multipart uploads
export const uploadSessions = pgTable("upload_sessions", {
  // Session ID (for client/server coordination)
  id: text("id").primaryKey(),

  // S3 Multipart Upload ID (Critical for S3 interaction)
  uploadId: text("upload_id").notNull(),

  // Validation
  targetHash: text("target_hash").notNull(),

  // Destination Context
  spaceId: text("space_id").references(() => spaces.id).notNull(),
  parentId: uuid("parent_id"), // null if root
  userId: text("user_id").references(() => users.id).notNull(),

  // Metadata buffer
  name: text("name").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  mimeType: text("mime_type"),

  // Cleanup: Session expires after 24h
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
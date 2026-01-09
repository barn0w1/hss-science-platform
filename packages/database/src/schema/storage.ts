import { pgTable, text, timestamp, boolean, bigint, uuid, integer, index } from "drizzle-orm/pg-core";
import { users } from "./core";

/**
 * Storage 
 */

// Spaces
export const spaces = pgTable("spaces", {
  // uuid
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  name: text("name").notNull(),
  ownerId: text("owner_id")
    .references(() => users.id)
    .notNull(),
  
  quotaBytes: bigint("quota_bytes", { mode: "number" }).default(10 * 1024 * 1024 * 1024),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});


// Blobs
export const blobs = pgTable("blobs", {
  // SHA256 Hash
  hash: text("hash")
    .primaryKey(),

  // Size in bytes
  size: bigint("size", { mode: "number" })
    .notNull(),
  
  // MIME type
  mimeType: text("mime_type")
    .notNull(),

  // Reference count
  refCount: integer("ref_count")
    .default(0)
    .notNull(),

  // Status (whether the upload is complete)
  // pending: uploading or failed / ready: complete and available
  status: text("status", { enum: ["pending", "ready"] }).default("pending").notNull(),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});


// Nodes
export const nodes = pgTable("nodes", {
  // uuid
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Which drive it belongs to
  spaceId: text("space_id").references(() => spaces.id).notNull(),
  
  // 親フォルダ (Rootの場合はnull)
  parentId: uuid("parent_id").references((): any => nodes.id),
  
  name: text("name").notNull(),
  
  // file か folder か
  type: text("type", { enum: ["file", "folder"] }).notNull(),

  // ファイルの場合のみ、Blobへのリンクを持つ
  // フォルダの場合はnull
  blobHash: text("blob_hash").references(() => blobs.hash),

  // ゴミ箱フラグ
  isTrashed: boolean("is_trashed").default(false).notNull(),
  
  // 作成者と更新日時
  ownerId: text("owner_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  // 検索を高速化するためのインデックス
  parentIdx: index("parent_idx").on(table.parentId),
  spaceIdx: index("space_idx").on(table.spaceId),
}));


// 4. Upload Sessions (マルチパートアップロード管理)
// クライアントがR2に直接アップロードしている間の情報を保持する
export const uploadSessions = pgTable("upload_sessions", {
  // セッションID (Presigned URL発行時に生成)
  id: text("id").primaryKey(),
  
  // S3のMultipart Upload ID (中断再開や完了処理に必要)
  uploadId: text("upload_id").notNull(),
  
  // 予定しているハッシュ値 (クライアントが計算)
  targetHash: text("target_hash").notNull(),
  
  // 誰がアップロードしているか
  userId: text("user_id").references(() => users.id).notNull(),
  
  // どのSpaceの、どのフォルダに置く予定か
  spaceId: text("space_id").references(() => spaces.id).notNull(),
  parentId: uuid("parent_id"), // nullならルート
  name: text("name").notNull(), // ファイル名
  size: bigint("size", { mode: "number" }).notNull(),
  mimeType: text("mime_type"),

  // 有効期限 (これを超えたらゴミとして掃除する)
  expiresAt: timestamp("expires_at").notNull(),
});
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").unique().notNull(),
  name: text("name"),
  email: text("email").unique(),
  passwordHash: text("passwordHash"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).defaultNow().notNull(),
  loginCount: integer("loginCount").default(0).notNull(),
  isOnline: integer("isOnline", { mode: "boolean" }).default(false).notNull(),
  lastActiveAt: integer("lastActiveAt", { mode: "timestamp" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const cardChecks = sqliteTable("card_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").references(() => users.id).notNull(),
  cardNumber: text("cardNumber").notNull(),
  status: text("status").notNull(), // 'live', 'die', 'error'
  response: text("response"),
  createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
});

export type CardCheck = typeof cardChecks.$inferSelect;
export type InsertCardCheck = typeof cardChecks.$inferInsert;

export const userStats = sqliteTable("user_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").references(() => users.id).unique().notNull(),
  totalChecks: integer("totalChecks").default(0).notNull(),
  liveCount: integer("liveCount").default(0).notNull(),
  dieCount: integer("dieCount").default(0).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
});

export type UserStat = typeof userStats.$inferSelect;
export type InsertUserStat = typeof userStats.$inferInsert;

import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  loginCount: int("loginCount").default(0).notNull(),
  isOnline: boolean("isOnline").default(false).notNull(),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Card check history table
 * Stores all card verification attempts
 */
export const cardChecks = mysqlTable("card_checks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cardNumber: varchar("cardNumber", { length: 20 }).notNull(),
  cardType: varchar("cardType", { length: 20 }).notNull(), // visa, master, amex, discover, other
  status: varchar("status", { length: 255 }).notNull(), // e.g., "1000: Approved", "2000: Declined"
  classification: varchar("classification", { length: 50 }), // Live, Dead, Unknown
  errorCode: varchar("errorCode", { length: 50 }),
  errorMessage: text("errorMessage"),
  responseTime: int("responseTime"), // in milliseconds
  proxyUsed: varchar("proxyUsed", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CardCheck = typeof cardChecks.$inferSelect;
export type InsertCardCheck = typeof cardChecks.$inferInsert;

/**
 * User statistics table
 * Aggregated stats for each user
 */
export const userStats = mysqlTable("user_stats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  totalChecks: int("totalChecks").default(0).notNull(),
  approvedCount: int("approvedCount").default(0).notNull(),
  declinedCount: int("declinedCount").default(0).notNull(),
  unknownCount: int("unknownCount").default(0).notNull(),
  averageResponseTime: int("averageResponseTime").default(0).notNull(),
  lastCheckAt: timestamp("lastCheckAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserStat = typeof userStats.$inferSelect;
export type InsertUserStat = typeof userStats.$inferInsert;

/**
 * Scheduled tasks for automated checking
 */
export const scheduledTasks = mysqlTable("scheduled_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  cardsList: text("cardsList").notNull(),
  proxy: varchar("proxy", { length: 255 }),
  schedule: varchar("schedule", { length: 100 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastRun: timestamp("lastRun"),
  nextRun: timestamp("nextRun"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type InsertScheduledTask = typeof scheduledTasks.$inferInsert;
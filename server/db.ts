import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-sqlite3";
import Database from "sqlite3";
import { InsertUser, users, CardCheck, InsertCardCheck, InsertUserStat, cardChecks, userStats } from "../drizzle/schema";
import { ENV } from './_core/env';
import path from 'path';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    try {
      // No Render, usaremos um arquivo local. Em produção, pode ser necessário um Persistent Disk.
      // Para este caso, usaremos o diretório atual ou /tmp se necessário.
      const dbPath = 'sqlite.db';
      const sqlite = new Database.Database(dbPath);
      _db = drizzle(sqlite);
      
      // Criar tabelas se não existirem (simplificado para SQLite)
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          openId TEXT UNIQUE NOT NULL,
          name TEXT,
          email TEXT UNIQUE,
          passwordHash TEXT,
          loginMethod TEXT,
          role TEXT DEFAULT 'user' NOT NULL,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          lastSignedIn INTEGER NOT NULL,
          loginCount INTEGER DEFAULT 0 NOT NULL,
          isOnline INTEGER DEFAULT 0 NOT NULL,
          lastActiveAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS card_checks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          cardNumber TEXT NOT NULL,
          status TEXT NOT NULL,
          response TEXT,
          createdAt INTEGER NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS user_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER UNIQUE NOT NULL,
          totalChecks INTEGER DEFAULT 0 NOT NULL,
          liveCount INTEGER DEFAULT 0 NOT NULL,
          dieCount INTEGER DEFAULT 0 NOT NULL,
          updatedAt INTEGER NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id)
        );
      `);
    } catch (error) {
      console.error("[Database] Failed to connect/initialize SQLite:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    
    const now = new Date();
    const values = {
      ...user,
      updatedAt: now,
    };

    if (existing.length > 0) {
      await db.update(users).set(values).where(eq(users.openId, user.openId));
    } else {
      if (!values.role && user.openId === ENV.ownerOpenId) {
        values.role = 'admin';
      }
      if (!values.createdAt) values.createdAt = now;
      if (!values.lastSignedIn) values.lastSignedIn = now;
      if (!values.lastActiveAt) values.lastActiveAt = now;
      await db.insert(users).values(values as any);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCardCheck(check: InsertCardCheck): Promise<CardCheck> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(cardChecks).values(check as any);
  const checkId = result.lastInsertRowid;
  const inserted = await db.select().from(cardChecks).where(eq(cardChecks.id, Number(checkId))).limit(1);
  return inserted[0];
}

export async function getCardChecksByUserId(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(cardChecks)
    .where(eq(cardChecks.userId, userId))
    .orderBy(sql`createdAt DESC`)
    .limit(limit)
    .offset(offset);
}

export async function getUserStats(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateUserStats(userId: number, stats: Partial<InsertUserStat>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await getUserStats(userId);
  if (!existing) {
    await db.insert(userStats).values({ userId, ...stats } as any);
  } else {
    await db.update(userStats).set({ ...stats, updatedAt: new Date() }).where(eq(userStats.userId, userId));
  }
}

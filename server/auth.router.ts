import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import crypto from "crypto";
import { checkRateLimit, resetRateLimit, getRemainingAttempts } from "./rateLimit";

// Simple password hashing (in production, use bcrypt or argon2)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  loginWithPassword: publicProcedure
    .input(
      z.object({
        email: z.string().min(1, "Username é obrigatório"),
        password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Rate limiting: check login attempts
      const rateLimitKey = `login:${input.email}`;
      if (!checkRateLimit(rateLimitKey)) {
        const remaining = getRemainingAttempts(rateLimitKey);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Muitas tentativas de login. Tente novamente em 15 minutos.`,
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Find user by name (username) since we use name as username
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.name, input.email))
          .limit(1);

        if (userRecord.length === 0 || !userRecord[0]?.passwordHash) {
          return {
            success: false,
            error: "Username ou senha incorretos",
          };
        }

        const user = userRecord[0];
        
        // Verify password
        if (!user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
          return {
            success: false,
            error: "Username ou senha incorretos",
          };
        }
        
        // Reset rate limit on successful login
        resetRateLimit(rateLimitKey);

        // Create session with JWT (browser session only - expires when browser closes)
        const cookieOptions = getSessionCookieOptions(ctx.req);
        const { sdk } = await import("./_core/sdk");
        const userName = (user.name || "") as string;
        // Use short expiry (1 hour) instead of 1 year to prevent persistent login
        const sessionToken = await sdk.createSessionToken(user.openId, { 
          name: userName as string,
          expiresInMs: 60 * 60 * 1000 // 1 hour session
        });
        // Set cookie without maxAge so it expires when browser closes
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });

        return {
          success: true,
          user,
        };
      } catch (error) {
        console.error("Login error:", error);
        return {
          success: false,
          error: "Erro ao fazer login",
        };
      }
    }),

  registerWithPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
        name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Check if user already exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (existingUser.length > 0) {
          return {
            success: false,
            error: "Email já cadastrado",
          };
        }

        // Create new user
        const passwordHash = hashPassword(input.password);
        const { nanoid } = await import("nanoid");
        const openId = nanoid();
        const result = await db.insert(users).values({
          openId,
          email: input.email,
          name: input.name,
          passwordHash,
          loginMethod: "password",
          role: "user",
        });

        // Get the created user
        const newUser = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (newUser.length === 0) {
          return {
            success: false,
            error: "Erro ao criar usuário",
          };
        }

        // Create session (browser session only - expires when browser closes)
        const cookieOptions = getSessionCookieOptions(ctx.req);
        // Set cookie without maxAge so it expires when browser closes
        ctx.res.cookie(COOKIE_NAME, JSON.stringify({ userId: newUser[0]!.id }), { ...cookieOptions });
        // Note: registerWithPassword should also use JWT like loginWithPassword for consistency

        return {
          success: true,
          user: newUser[0],
        };
      } catch (error) {
        console.error("Register error:", error);
        return {
          success: false,
          error: "Erro ao registrar usuário",
        };
      }
    }),
});

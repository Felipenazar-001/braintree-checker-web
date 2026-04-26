import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export const adminRouter = router({
  // Get admin stats
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Apenas administradores podem acessar",
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
      const allUsers = await db.select().from(users);
      const totalUsers = allUsers.length;
      const onlineUsers = allUsers.filter(u => u.isOnline).length;
      const totalLogins = allUsers.reduce((acc, u) => acc + (u.loginCount || 0), 0);

      return {
        totalUsers,
        onlineUsers,
        totalLogins,
      };
    } catch (error) {
      console.error("Error getting admin stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao obter estatísticas",
      });
    }
  }),

  // List all users
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Apenas administradores podem acessar",
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
      const allUsers = await db.select().from(users);
        return allUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        loginMethod: user.loginMethod,
        role: user.role,
        createdAt: user.createdAt,
        lastSignedIn: user.lastSignedIn,
        loginCount: user.loginCount,
        isOnline: user.isOnline,
        lastActiveAt: user.lastActiveAt,
      }));
    } catch (error) {
      console.error("Error listing users:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao listar usuários",
      });
    }
  }),

  // Create new user
  createUser: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
        username: z.string().min(3, "Username deve ter no mínimo 3 caracteres"),
        password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
        role: z.enum(["user", "admin"]).default("user"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem criar usuários",
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
        // Check if username already exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, input.username))
          .limit(1);

        if (existingUser.length > 0) {
          return {
            success: false,
            error: "Username já cadastrado",
          };
        }

        // Create new user
        const passwordHash = hashPassword(input.password);
        const { nanoid } = await import("nanoid");
        const openId = nanoid();
        await db.insert(users).values({
          openId,
          email: input.username,
          name: input.name,
          passwordHash,
          loginMethod: "password",
          role: input.role,
        });

        return {
          success: true,
          message: `Usuário ${input.name} criado com sucesso`,
        };
      } catch (error) {
        console.error("Error creating user:", error);
        return {
          success: false,
          error: "Erro ao criar usuário",
        };
      }
    }),

  // Update user
  updateUser: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        password: z.string().min(6).optional(),
        role: z.enum(["user", "admin"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem atualizar usuários",
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
        const updateData: Record<string, any> = {};
        if (input.name) updateData.name = input.name;
        if (input.password) updateData.passwordHash = hashPassword(input.password);
        if (input.role) updateData.role = input.role;
        updateData.updatedAt = new Date();

        await db.update(users).set(updateData).where(eq(users.id, input.id));

        return {
          success: true,
          message: "Usuário atualizado com sucesso",
        };
      } catch (error) {
        console.error("Error updating user:", error);
        return {
          success: false,
          error: "Erro ao atualizar usuário",
        };
      }
    }),

  // Delete user
  deleteUser: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem deletar usuários",
        });
      }

      // Prevent deleting yourself
      if (input.id === ctx.user?.id) {
        return {
          success: false,
          error: "Você não pode deletar sua própria conta",
        };
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        await db.delete(users).where(eq(users.id, input.id));

        return {
          success: true,
          message: "Usuário deletado com sucesso",
        };
      } catch (error) {
        console.error("Error deleting user:", error);
        return {
          success: false,
          error: "Erro ao deletar usuário",
        };
      }
    }),
});

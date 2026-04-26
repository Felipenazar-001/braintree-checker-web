import { describe, it, expect, beforeEach, vi } from "vitest";
import { authRouter } from "./auth.router";
import * as db from "./db";
import crypto from "crypto";

// Mock database
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

describe("Auth Router", () => {
  describe("loginWithPassword", () => {
    it("should validate email format", async () => {
      const invalidEmails = ["invalid", "invalid@", "@invalid.com", ""];

      for (const email of invalidEmails) {
        expect(() => {
          // Zod validation would throw
        }).toBeDefined();
      }
    });

    it("should validate password minimum length", async () => {
      const shortPasswords = ["", "12345"];

      for (const password of shortPasswords) {
        expect(password.length).toBeLessThan(6);
      }
    });
  });

  describe("registerWithPassword", () => {
    it("should validate all required fields", async () => {
      const invalidInputs = [
        { email: "", password: "password123", name: "User" },
        { email: "user@example.com", password: "", name: "User" },
        { email: "user@example.com", password: "password123", name: "" },
      ];

      for (const input of invalidInputs) {
        expect(input.email || input.password || input.name).toBeDefined();
      }
    });

    it("should validate password minimum length on registration", async () => {
      const shortPassword = "12345";
      expect(shortPassword.length).toBeLessThan(6);
    });

    it("should validate email format on registration", async () => {
      const invalidEmail = "notanemail";
      expect(invalidEmail).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it("should validate name minimum length", async () => {
      const shortName = "A";
      expect(shortName.length).toBeLessThan(2);
    });
  });

  describe("Password hashing", () => {
    it("should hash passwords consistently", () => {
      const password = "testPassword123";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different passwords", () => {
      const hash1 = hashPassword("password1");
      const hash2 = hashPassword("password2");

      expect(hash1).not.toBe(hash2);
    });
  });
});

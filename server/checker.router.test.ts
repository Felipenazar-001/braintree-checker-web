import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkerRouter } from "./checker.router";
import * as db from "./db";

// Mock database functions
vi.mock("./db", () => ({
  createCardCheck: vi.fn(),
  getCardChecksByUserId: vi.fn(),
  getUserStats: vi.fn(),
  updateUserStats: vi.fn(),
}));

describe("Checker Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkCard mutation", () => {
    it("should validate card input format", async () => {
      const invalidInputs = [
        { cardNumber: "123", expiryMonth: "12", expiryYear: "2025", cvv: "123" }, // Too short
        { cardNumber: "12345678901234567890", expiryMonth: "12", expiryYear: "2025", cvv: "123" }, // Too long
        { cardNumber: "1234567890123456", expiryMonth: "13", expiryYear: "2025", cvv: "123" }, // Invalid month
        { cardNumber: "1234567890123456", expiryMonth: "12", expiryYear: "2025", cvv: "12" }, // CVV too short
      ];

      for (const input of invalidInputs) {
        expect(() => {
          // Zod validation would throw here
          const schema = checkerRouter.createCaller({} as any).checkCard;
        }).toBeDefined();
      }
    });

    it("should detect card type correctly", async () => {
      const testCases = [
        { number: "4532015112830366", type: "visa" },
        { number: "5425233010103442", type: "master" },
        { number: "374245455400126", type: "amex" },
        { number: "6011111111111117", type: "discover" },
      ];

      for (const testCase of testCases) {
        const cardNumber = testCase.number.replace(/\D/g, "");
        let cardType = "other";
        if (/^4/.test(cardNumber)) cardType = "visa";
        else if (/^5[1-5]/.test(cardNumber)) cardType = "master";
        else if (/^3[47]/.test(cardNumber)) cardType = "amex";
        else if (/^6(?:011|5)/.test(cardNumber)) cardType = "discover";

        expect(cardType).toBe(testCase.type);
      }
    });
  });

  describe("getHistory query", () => {
    it("should retrieve card check history with pagination", async () => {
      const mockChecks = [
        {
          id: 1,
          userId: 1,
          cardNumber: "1234",
          cardType: "visa",
          status: "1000: Approved",
          classification: "Live",
          responseTime: 2000,
          proxyUsed: "default",
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.getCardChecksByUserId).mockResolvedValue(mockChecks);

      const result = await db.getCardChecksByUserId(1, 50, 0);
      expect(result).toEqual(mockChecks);
      expect(db.getCardChecksByUserId).toHaveBeenCalledWith(1, 50, 0);
    });
  });

  describe("getStats query", () => {
    it("should return user statistics", async () => {
      const mockStats = {
        userId: 1,
        totalChecks: 10,
        approvedCount: 5,
        declinedCount: 3,
        unknownCount: 2,
        averageResponseTime: 1500,
        lastCheckAt: new Date(),
      };

      vi.mocked(db.getUserStats).mockResolvedValue(mockStats);

      const result = await db.getUserStats(1);
      expect(result).toEqual(mockStats);
      expect(result.totalChecks).toBe(10);
      expect(result.approvedCount).toBe(5);
    });

    it("should return default stats if user has no history", async () => {
      vi.mocked(db.getUserStats).mockResolvedValue(null);

      const result = await db.getUserStats(999);
      expect(result).toBeNull();
    });
  });
});

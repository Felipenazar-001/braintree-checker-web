import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  createCardCheck,
  getCardChecksByUserId,
  getUserStats,
  updateUserStats,
} from "./db";
import { checkCardWithPayPal } from "./paypal.service";
import { getExpectedReturns, isReturnLive } from "../shared/cardReturns";

const CheckCardInput = z.object({
  cardNumber: z.string().min(15).max(19),
  expiryMonth: z.string().regex(/^\d{1,2}$/),
  expiryYear: z.string().regex(/^\d{2,4}$/),
  cvv: z.string().regex(/^\d{3,4}$/),
  proxy: z.string().optional(),
  orderId: z.string().optional(),
  installmentTerm: z.number().optional(),
});

export const checkerRouter = router({
  checkCard: protectedProcedure
    .input(CheckCardInput)
    .mutation(async ({ input, ctx }) => {
      try {
        // Format card data
        const cardNumber = input.cardNumber.replace(/\D/g, "");
        const month = input.expiryMonth.padStart(2, "0");
        const year = input.expiryYear.length === 2 ? "20" + input.expiryYear : input.expiryYear;
        const cvv = input.cvv;

        // Determine card type
        let cardType = "other";
        if (/^4/.test(cardNumber)) cardType = "visa";
        else if (/^5[1-5]/.test(cardNumber)) cardType = "master";
        else if (/^3[47]/.test(cardNumber)) cardType = "amex";
        else if (/^6(?:011|5)/.test(cardNumber)) cardType = "discover";

        // Get expected returns for this card based on bank and brand
        const expectedInfo = getExpectedReturns(cardNumber);

        // Simulate processing with realistic delay
        const startTime = Date.now();
        const responseTime = Math.random() * 3000 + 500; // Simulated delay
        await new Promise((resolve) => setTimeout(resolve, responseTime));

        // Generate realistic return code based on bank/brand
        let returnCode = "10"; // Default fallback
        let classification = "Unknown";
        let status = "10: Sem retorno identificado";

        if (expectedInfo.expectedReturns.length > 0) {
          // Randomly select one of the expected return codes for this bank/brand
          const randomIndex = Math.floor(Math.random() * expectedInfo.expectedReturns.length);
          returnCode = expectedInfo.expectedReturns[randomIndex]!;

          // Check if it's a LIVE return
          const isLive = isReturnLive(cardNumber, returnCode);

          if (isLive) {
            classification = "Live";
            status = `${returnCode}: Aprovado (Vinculado)`;
          } else {
            classification = "Dead";
            status = `${returnCode}: Recusado`;
          }
        } else {
          // No expected returns found for this BIN
          classification = "Unknown";
          status = "10: Banco não identificado";
        }

        const result = { status, classification };

        // Save to database
        const check = await createCardCheck({
          userId: ctx.user!.id,
          cardNumber: cardNumber.slice(-4), // Store only last 4 digits
          cardType,
          status: result.status,
          classification: result.classification,
          responseTime: Math.round(responseTime),
          proxyUsed: input.proxy || "default",
        });

        // Update user stats
        const currentStats = await getUserStats(ctx.user!.id);
        const newStats = {
          totalChecks: (currentStats?.totalChecks || 0) + 1,
          approvedCount:
            (currentStats?.approvedCount || 0) +
            (result.classification === "Live" ? 1 : 0),
          declinedCount:
            (currentStats?.declinedCount || 0) +
            (result.classification === "Dead" ? 1 : 0),
          unknownCount:
            (currentStats?.unknownCount || 0) +
            (result.classification === "Unknown" ? 1 : 0),
          averageResponseTime: Math.round(
            ((currentStats?.averageResponseTime || 0) * (currentStats?.totalChecks || 0) +
              Math.round(responseTime)) /
              ((currentStats?.totalChecks || 0) + 1)
          ),
          lastCheckAt: new Date(),
        };
        await updateUserStats(ctx.user!.id, newStats);

        return {
          success: true,
          check,
          stats: newStats,
        };
      } catch (error) {
        console.error("[Checker] Error checking card:", error);
        throw new Error("Failed to check card");
      }
    }),

  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const checks = await getCardChecksByUserId(
        ctx.user!.id,
        input.limit,
        input.offset
      );
      return checks;
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getUserStats(ctx.user!.id);
    return (
      stats || {
        userId: ctx.user!.id,
        totalChecks: 0,
        approvedCount: 0,
        declinedCount: 0,
        unknownCount: 0,
        averageResponseTime: 0,
        lastCheckAt: null,
      }
    );
  }),

  checkCardPayPal: protectedProcedure
    .input(CheckCardInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const startTime = Date.now();
        const result = await checkCardWithPayPal({
          cardNumber: input.cardNumber.replace(/\D/g, ""),
          expiryMonth: input.expiryMonth,
          expiryYear: input.expiryYear,
          cvv: input.cvv,
          proxy: input.proxy,
          orderId: input.orderId,
          installmentTerm: input.installmentTerm,
        });
        const responseTime = Date.now() - startTime;

        return {
          success: true,
          result,
          responseTime,
        };
      } catch (error) {
        console.error("[PayPal Checker] Error:", error);
        throw new Error("Failed to check card with PayPal");
      }
    }),
});

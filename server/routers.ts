import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { checkerRouter } from "./checker.router";
import { authRouter } from "./auth.router";
import { adminRouter } from "./admin.router";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  checker: checkerRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

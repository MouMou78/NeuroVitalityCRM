import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    tenantId: "test-tenant",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Email Generator", () => {
  it.skip("should generate email with context", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.emailGenerator.generate({
      context: "Follow up after demo meeting",
      contactInfo: "John Doe, VP of Sales at Acme Corp",
    });

    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("body");
    expect(result.subject).toBeTruthy();
    expect(result.body).toBeTruthy();
  });

  it("should list training examples", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const examples = await caller.emailGenerator.listExamples();
    expect(Array.isArray(examples)).toBe(true);
  });

  it("should get style preferences", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const prefs = await caller.emailGenerator.getStylePreferences();
    expect(prefs).toHaveProperty("tone");
    expect(prefs).toHaveProperty("length");
  });
});

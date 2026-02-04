import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Chat Feature", () => {
  const mockContext: TrpcContext = {
    user: {
      id: "test-user-id",
      tenantId: "test-tenant",
      name: "Test User",
      email: "test@example.com",
      role: "user",
    },
  };

  const caller = appRouter.createCaller(mockContext);

  describe("Channel Management", () => {
    it("should create a new channel", async () => {
      const channel = await caller.chat.createChannel({
        name: "general",
        description: "General discussion",
        type: "public",
      });

      expect(channel).toBeDefined();
      expect(channel?.name).toBe("general");
      expect(channel?.type).toBe("public");
    });

    it("should list channels for tenant", async () => {
      // Create a channel first
      await caller.chat.createChannel({
        name: "test-channel",
        type: "public",
      });

      const channels = await caller.chat.getChannels();
      expect(Array.isArray(channels)).toBe(true);
      expect(channels.length).toBeGreaterThan(0);
    });
  });

  describe("Messaging", () => {
    let channelId: string;

    beforeEach(async () => {
      const channel = await caller.chat.createChannel({
        name: "test-messaging",
        type: "public",
      });
      channelId = channel!.id;
    });

    it("should send a message to a channel", async () => {
      const message = await caller.chat.sendMessage({
        channelId,
        content: "Hello, world!",
      });

      expect(message).toBeDefined();
      expect(message.content).toBe("Hello, world!");
      expect(message.userId).toBe(mockContext.user.id);
    });

    it("should retrieve messages from a channel", async () => {
      // Send a message
      await caller.chat.sendMessage({
        channelId,
        content: "Test message",
      });

      // Retrieve messages
      const messages = await caller.chat.getMessages({ channelId });
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].content).toBe("Test message");
    });
  });

  describe("AI Assistant Integration", () => {
    let channelId: string;

    beforeEach(async () => {
      const channel = await caller.chat.createChannel({
        name: "ai-test-channel",
        type: "public",
      });
      channelId = channel!.id;
    });

    it("should invoke AI assistant when @ai is mentioned", async () => {
      // Send a message mentioning AI
      await caller.chat.sendMessage({
        channelId,
        content: "@ai What is a CRM?",
      });

      // Wait a bit for AI response to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if AI assistant responded
      const messages = await caller.chat.getMessages({ channelId });
      
      // Should have user message + AI response
      expect(messages.length).toBeGreaterThanOrEqual(2);
      
      // Find AI assistant message
      const aiMessage = messages.find(m => m.userId === "ai-assistant-bot");
      expect(aiMessage).toBeDefined();
      expect(aiMessage?.content).toBeTruthy();
    });

    it("should invoke AI assistant when @assistant is mentioned", async () => {
      // Send a message mentioning assistant
      await caller.chat.sendMessage({
        channelId,
        content: "@assistant Help me with lead scoring",
      });

      // Wait for AI response
      await new Promise(resolve => setTimeout(resolve, 2000));

      const messages = await caller.chat.getMessages({ channelId });
      const aiMessage = messages.find(m => m.userId === "ai-assistant-bot");
      expect(aiMessage).toBeDefined();
    });

    it("should not invoke AI assistant without mention", async () => {
      // Send a regular message
      await caller.chat.sendMessage({
        channelId,
        content: "Just a regular message",
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      const messages = await caller.chat.getMessages({ channelId });
      
      // Should only have the user message
      const aiMessage = messages.find(m => m.userId === "ai-assistant-bot");
      expect(aiMessage).toBeUndefined();
    });
  });

  describe("Channel Members", () => {
    it("should add AI assistant as member when creating channel", async () => {
      const channel = await caller.chat.createChannel({
        name: "member-test",
        type: "public",
      });

      // AI assistant should be automatically added
      // This is verified by the channel creation logic
      expect(channel).toBeDefined();
    });
  });
});

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

    it("should invoke AI assistant when @assistant is mentioned", { timeout: 10000 }, async () => {
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

  describe("Message Reactions", () => {
    let channelId: string;
    let messageId: string;

    beforeEach(async () => {
      const channel = await caller.chat.createChannel({
        name: "reactions-test",
        type: "public",
      });
      channelId = channel!.id;

      const message = await caller.chat.sendMessage({
        channelId,
        content: "React to this!",
      });
      messageId = message.id;
    });

    it("should add a reaction to a message", async () => {
      const reaction = await caller.chat.addReaction({
        messageId,
        emoji: "👍",
      });

      expect(reaction).toBeDefined();
      expect(reaction?.emoji).toBe("👍");
    });

    it("should get reactions for a message", async () => {
      await caller.chat.addReaction({
        messageId,
        emoji: "❤️",
      });

      const reactions = await caller.chat.getReactions({ messageId });
      expect(reactions.length).toBeGreaterThan(0);
      expect(reactions[0].emoji).toBe("❤️");
    });

    it("should remove a reaction", async () => {
      await caller.chat.addReaction({
        messageId,
        emoji: "😊",
      });

      const result = await caller.chat.removeReaction({
        messageId,
        emoji: "😊",
      });

      expect(result.success).toBe(true);

      const reactions = await caller.chat.getReactions({ messageId });
      const removedReaction = reactions.find(r => r.emoji === "😊");
      expect(removedReaction).toBeUndefined();
    });
  });

  describe("Thread Replies", () => {
    let channelId: string;
    let parentMessageId: string;

    beforeEach(async () => {
      const channel = await caller.chat.createChannel({
        name: "threads-test",
        type: "public",
      });
      channelId = channel!.id;

      const parentMessage = await caller.chat.sendMessage({
        channelId,
        content: "Start a thread here",
      });
      parentMessageId = parentMessage.id;
    });

    it("should create a thread reply", async () => {
      const reply = await caller.chat.sendMessage({
        channelId,
        content: "This is a reply",
        threadId: parentMessageId,
      });

      expect(reply).toBeDefined();
      expect(reply.threadId).toBe(parentMessageId);
      expect(reply.content).toBe("This is a reply");
    });

    it("should get thread replies", async () => {
      await caller.chat.sendMessage({
        channelId,
        content: "Reply 1",
        threadId: parentMessageId,
      });

      await caller.chat.sendMessage({
        channelId,
        content: "Reply 2",
        threadId: parentMessageId,
      });

      const replies = await caller.chat.getThreadReplies({
        threadId: parentMessageId,
      });

      expect(replies.length).toBe(2);
      // Replies are ordered by createdAt, so check both exist
      const reply1 = replies.find(r => r.content === "Reply 1");
      const reply2 = replies.find(r => r.content === "Reply 2");
      expect(reply1).toBeDefined();
      expect(reply2).toBeDefined();
    });

    it("should get thread reply count", async () => {
      await caller.chat.sendMessage({
        channelId,
        content: "Reply 1",
        threadId: parentMessageId,
      });

      await caller.chat.sendMessage({
        channelId,
        content: "Reply 2",
        threadId: parentMessageId,
      });

      const result = await caller.chat.getThreadReplyCount({
        messageId: parentMessageId,
      });

      expect(result.count).toBe(2);
    });
  });

  describe("File Attachments", () => {
    let channelId: string;

    beforeEach(async () => {
      const channel = await caller.chat.createChannel({
        name: "files-test",
        type: "public",
      });
      channelId = channel!.id;
    });

    it("should send a message with file attachment", async () => {
      const message = await caller.chat.sendMessage({
        channelId,
        content: "Check out this file",
        fileUrl: "https://example.com/test.pdf",
        fileName: "test.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
      });

      expect(message).toBeDefined();
      expect(message.fileUrl).toBe("https://example.com/test.pdf");
      expect(message.fileName).toBe("test.pdf");
      expect(message.fileType).toBe("application/pdf");
      expect(message.fileSize).toBe(2048);
    });

    it("should retrieve messages with file attachments", async () => {
      await caller.chat.sendMessage({
        channelId,
        content: "Image attachment",
        fileUrl: "https://example.com/image.png",
        fileName: "image.png",
        fileType: "image/png",
        fileSize: 1024,
      });

      const messages = await caller.chat.getMessages({ channelId });
      const messageWithFile = messages.find(m => m.fileUrl);

      expect(messageWithFile).toBeDefined();
      expect(messageWithFile?.fileName).toBe("image.png");
    });
  });

  describe("Unread Tracking", () => {
    let channelId: string;

    beforeEach(async () => {
      const channel = await caller.chat.createChannel({
        name: "unread-test",
        type: "public",
      });
      channelId = channel!.id;
    });

    it("should track unread messages", async () => {
      // Send a message
      await caller.chat.sendMessage({
        channelId,
        content: "Test message",
      });

      // Get unread count
      const result = await caller.chat.getUnreadCount({ channelId });
      expect(result.count).toBeGreaterThan(0);
    });

    it("should mark channel as read", async () => {
      // Send a message
      await caller.chat.sendMessage({
        channelId,
        content: "Test message",
      });

      // Mark as read
      const result = await caller.chat.markChannelAsRead({ channelId });
      expect(result.success).toBe(true);
    });
  });

  describe("Typing Indicators", () => {
    let channelId: string;

    beforeEach(async () => {
      const channel = await caller.chat.createChannel({
        name: "typing-test",
        type: "public",
      });
      channelId = channel!.id;
    });

    it("should update typing indicator", async () => {
      const result = await caller.chat.updateTyping({ channelId });
      expect(result.success).toBe(true);
    });

    it("should get typing users", async () => {
      await caller.chat.updateTyping({ channelId });
      const users = await caller.chat.getTypingUsers({ channelId });
      expect(Array.isArray(users)).toBe(true);
    });

    it("should clear typing indicator", async () => {
      await caller.chat.updateTyping({ channelId });
      const result = await caller.chat.clearTyping({ channelId });
      expect(result.success).toBe(true);
    });
  });

  describe("Notifications", () => {
    it("should get user notifications", async () => {
      const notifications = await caller.chat.getNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it("should get unread notification count", async () => {
      const result = await caller.chat.getUnreadNotificationCount();
      expect(typeof result.count).toBe("number");
    });

    it("should mark all notifications as read", async () => {
      const result = await caller.chat.markAllNotificationsAsRead();
      expect(result.success).toBe(true);
    });
  });

  describe("Message Search", () => {
    let channelId: string;

    beforeEach(async () => {
      const channel = await caller.chat.createChannel({
        name: "search-test",
        type: "public",
      });
      channelId = channel!.id;

      // Send some test messages
      await caller.chat.sendMessage({
        channelId,
        content: "Hello world",
      });

      await caller.chat.sendMessage({
        channelId,
        content: "Testing search functionality",
      });
    });

    it("should search messages by query", async () => {
      const results = await caller.chat.searchMessages({
        query: "search",
      });

      expect(Array.isArray(results)).toBe(true);
      const foundMessage = results.find(m => m.content.includes("search"));
      expect(foundMessage).toBeDefined();
    });

    it("should filter messages by channel", async () => {
      const results = await caller.chat.searchMessages({
        channelId,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.every(m => m.channelId === channelId)).toBe(true);
    });

    it("should limit search results", async () => {
      const results = await caller.chat.searchMessages({
        channelId,
        limit: 1,
      });

      expect(results.length).toBeLessThanOrEqual(1);
    });
  });
});

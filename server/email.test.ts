import { describe, it, expect } from "vitest";

describe("Email Service", () => {
  it("should have SMTP credentials configured", () => {
    expect(process.env.SMTP_HOST).toBeDefined();
    expect(process.env.SMTP_PORT).toBeDefined();
    expect(process.env.SMTP_USER).toBeDefined();
    expect(process.env.SMTP_PASS).toBeDefined();
  });

  it("should validate SMTP connection", async () => {
    const nodemailer = await import("nodemailer");
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    await expect(transporter.verify()).resolves.toBe(true);
  }, 30000); // 30 second timeout for network operation
});

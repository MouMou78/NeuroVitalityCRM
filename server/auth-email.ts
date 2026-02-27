import { router, publicProcedure, protectedProcedure } from "./server/_core/trpc";
import { z } from "zod";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { users, tenants } from "../drizzle/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";

// Helper to generate backup codes
function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
  }
  return codes;
}

export const emailAuthRouter = router({
  // Sign up with email and password
  signup: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Create tenant for new user
      const tenantId = uuidv4();
      await db.insert(tenants).values({
        id: tenantId,
        name: `${input.name}'s Organization`,
      });

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create user
      const userId = uuidv4();
      await db.insert(users).values({
        id: userId,
        tenantId,
        email: input.email,
        passwordHash,
        name: input.name,
        role: "user", // Default role, will be updated to admin for specific email
        twoFactorEnabled: false,
      });

      return {
        success: true,
        userId,
        message: "Account created successfully. Please set up 2FA.",
      };
    }),

  // Login with email and password
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
      twoFactorCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Check if user is disabled
      if (user.disabled) {
        throw new Error("Account has been disabled");
      }

      // Verify password
      const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordValid) {
        throw new Error("Invalid email or password");
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!input.twoFactorCode) {
          return {
            success: false,
            requires2FA: true,
            message: "2FA code required",
          };
        }

        // Verify 2FA code
        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret!,
          encoding: "base32",
          token: input.twoFactorCode,
          window: 2,
        });

        if (!verified) {
          throw new Error("Invalid 2FA code");
        }
      }

      // Return user data (session will be created by the auth middleware)
      return {
        success: true,
        requires2FA: false,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        },
      };
    }),

  // Setup 2FA - generate secret and QR code
  setup2FA: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Generate 2FA secret
      const secret = speakeasy.generateSecret({
        name: `NeuroVitality CRM (${user.email})`,
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = generateBackupCodes();

      // Save secret (but don't enable yet)
      await db.update(users)
        .set({
          twoFactorSecret: secret.base32,
          backupCodes,
        })
        .where(eq(users.id, ctx.user.id));

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes,
      };
    }),

  // Verify and enable 2FA
  enable2FA: protectedProcedure
    .input(z.object({
      code: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user || !user.twoFactorSecret) {
        throw new Error("2FA not set up");
      }

      // Verify code
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: input.code,
        window: 2,
      });

      if (!verified) {
        throw new Error("Invalid code");
      }

      // Enable 2FA
      await db.update(users)
        .set({ twoFactorEnabled: true })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "2FA enabled successfully",
      };
    }),

  // Disable 2FA
  disable2FA: protectedProcedure
    .input(z.object({
      password: z.string(),
      code: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify password
      const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordValid) {
        throw new Error("Invalid password");
      }

      // Verify 2FA code
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: "base32",
          token: input.code,
          window: 2,
        });

        if (!verified) {
          throw new Error("Invalid 2FA code");
        }
      }

      // Disable 2FA
      await db.update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: null,
        })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "2FA disabled successfully",
      };
    }),

  // Check 2FA status
  check2FAStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      return {
        enabled: user?.twoFactorEnabled || false,
        hasSecret: !!user?.twoFactorSecret,
      };
    }),
});

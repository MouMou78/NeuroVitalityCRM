import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

/**
 * Initialize email transporter with Google SMTP
 */
function getTransporter(): Transporter {
  if (!transporter) {
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      throw new Error("SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.");
    }

    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // Use TLS
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  return transporter!;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  baseUrl: string
): Promise<void> {
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject: "Password Reset Request - CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password for your CRM account.</p>
        <p>Click the link below to reset your password:</p>
        <p>
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          CRM - Customer Relationship Management<br>
          This is an automated email, please do not reply.
        </p>
      </div>
    `,
  };

  const transport = getTransporter();
  await transport.sendMail(mailOptions);
}

/**
 * Send welcome email with 2FA setup instructions
 */
export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject: "Welcome to CRM!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to CRM, ${name}!</h2>
        <p>Your account has been successfully created.</p>
        <p>You've set up two-factor authentication (2FA) to keep your account secure. Make sure to save your backup codes in a safe place.</p>
        <p>Get started by logging in and exploring your new CRM:</p>
        <ul>
          <li>Manage your contacts and leads</li>
          <li>Track engagement and conversations</li>
          <li>Collaborate with your team</li>
          <li>Get AI-powered insights</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          CRM - Customer Relationship Management<br>
          This is an automated email, please do not reply.
        </p>
      </div>
    `,
  };

  const transport = getTransporter();
  await transport.sendMail(mailOptions);
}

/**
 * Send generic email
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  };

  const transport = getTransporter();
  await transport.sendMail(mailOptions);
}


/**
 * Send deal intelligence alert email
 */
export async function sendDealAlertEmail(opts) {
  const severityColor = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#2563eb' };
  const color = severityColor[opts.severity] || '#6b7280';
  const severityLabel = opts.severity.charAt(0).toUpperCase() + opts.severity.slice(1);
  const html = `<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;'><div style='background:white;border-radius:8px;padding:24px;border-left:4px solid ${color};'><h2 style='color:#111827'>${opts.title}</h2><p style='color:#374151'>${opts.body}</p></div></div>`;
  const mailOptions = { from: process.env.SMTP_USER, to: opts.to, subject: '[' + severityLabel + '] ' + opts.title, html };
  const transport = getTransporter();
  await transport.sendMail(mailOptions);
}

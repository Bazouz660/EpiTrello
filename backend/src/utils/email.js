import nodemailer from 'nodemailer';

import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Creates the email transporter based on environment configuration.
 * Returns null if SMTP is not configured.
 */
const createTransporter = () => {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
};

/**
 * Generates the HTML email template for password reset.
 */
const getPasswordResetEmailHtml = (resetUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #0f172a;">Reset Your Password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #475569;">
                You requested to reset your password for your EpiTrello account. Click the button below to set a new password:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px; text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 6px;">Reset Password</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #64748b;">
                This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #64748b;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 20px; color: #3b82f6; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8; text-align: center;">
                &copy; ${new Date().getFullYear()} EpiTrello. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Generates the plain text email for password reset.
 */
const getPasswordResetEmailText = (resetUrl) => `
Reset Your Password

You requested to reset your password for your EpiTrello account.

Click the link below to set a new password:
${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} EpiTrello. All rights reserved.
`;

/**
 * Sends a password reset email to the user.
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
  const transporter = createTransporter();

  // If SMTP is not configured, log the reset link (useful for development)
  if (!transporter) {
    logger.warn('SMTP not configured. Email will not be sent.');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('PASSWORD RESET EMAIL (SMTP Not Configured)');
    logger.info(`To: ${email}`);
    logger.info(`Reset Link: ${resetUrl}`);
    logger.info('═══════════════════════════════════════════════════════════');
    return { success: true, resetUrl, sent: false };
  }

  const fromAddress = env.SMTP_FROM_EMAIL
    ? `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`
    : `"${env.SMTP_FROM_NAME}" <${env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: 'Reset your EpiTrello password',
      text: getPasswordResetEmailText(resetUrl),
      html: getPasswordResetEmailHtml(resetUrl),
    });

    logger.info(`Password reset email sent to ${email} (messageId: ${info.messageId})`);

    // If using Ethereal, log the preview URL for easy access
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info('═══════════════════════════════════════════════════════════');
      logger.info('📧 ETHEREAL EMAIL PREVIEW');
      logger.info(`View email: ${previewUrl}`);
      logger.info('═══════════════════════════════════════════════════════════');
    }

    return { success: true, messageId: info.messageId, sent: true, previewUrl };
  } catch (error) {
    logger.error(`Failed to send password reset email to ${email}:`, error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Verifies the SMTP connection. Useful for health checks.
 */
export const verifyEmailConnection = async () => {
  const transporter = createTransporter();

  if (!transporter) {
    return { configured: false };
  }

  try {
    await transporter.verify();
    return { configured: true, connected: true };
  } catch (error) {
    logger.error('SMTP connection verification failed:', error);
    return { configured: true, connected: false, error: error.message };
  }
};

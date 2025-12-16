import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('email utility', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('sendPasswordResetEmail', () => {
    it('logs reset link when SMTP is not configured', async () => {
      vi.doMock('../src/config/env.js', () => ({
        env: {
          NODE_ENV: 'test',
          CLIENT_URL: 'http://localhost:5173',
          SMTP_HOST: '',
          SMTP_PORT: 587,
          SMTP_SECURE: false,
          SMTP_USER: '',
          SMTP_PASS: '',
          SMTP_FROM_NAME: 'EpiTrello',
          SMTP_FROM_EMAIL: '',
        },
      }));

      vi.doMock('../src/utils/logger.js', () => ({
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { sendPasswordResetEmail } = await import('../src/utils/email.js');
      const { logger } = await import('../src/utils/logger.js');

      const result = await sendPasswordResetEmail('test@example.com', 'test-token');

      expect(result.success).toBe(true);
      expect(result.sent).toBe(false);
      expect(result.resetUrl).toContain('/reset-password?token=test-token');
      expect(logger.warn).toHaveBeenCalledWith('SMTP not configured. Email will not be sent.');
    });

    it('sends email when SMTP is configured', async () => {
      vi.doMock('../src/config/env.js', () => ({
        env: {
          NODE_ENV: 'test',
          CLIENT_URL: 'http://localhost:5173',
          SMTP_HOST: 'smtp.test.com',
          SMTP_PORT: 587,
          SMTP_SECURE: false,
          SMTP_USER: 'user@test.com',
          SMTP_PASS: 'password',
          SMTP_FROM_NAME: 'EpiTrello',
          SMTP_FROM_EMAIL: 'noreply@test.com',
        },
      }));

      vi.doMock('../src/utils/logger.js', () => ({
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      vi.doMock('nodemailer', () => ({
        default: {
          createTransport: vi.fn(() => ({
            sendMail: vi.fn().mockResolvedValue({
              messageId: 'test-message-id',
            }),
          })),
          getTestMessageUrl: vi.fn(() => 'https://ethereal.email/message/test'),
        },
      }));

      const { sendPasswordResetEmail } = await import('../src/utils/email.js');

      const result = await sendPasswordResetEmail('test@example.com', 'test-token');

      expect(result.success).toBe(true);
      expect(result.sent).toBe(true);
      expect(result.messageId).toBe('test-message-id');
    });

    it('throws error when sendMail fails', async () => {
      vi.doMock('nodemailer', () => ({
        default: {
          createTransport: vi.fn(() => ({
            sendMail: vi.fn().mockRejectedValue(new Error('SMTP error')),
          })),
          getTestMessageUrl: vi.fn(() => null),
        },
      }));

      vi.doMock('../src/config/env.js', () => ({
        env: {
          NODE_ENV: 'test',
          CLIENT_URL: 'http://localhost:5173',
          SMTP_HOST: 'smtp.test.com',
          SMTP_PORT: 587,
          SMTP_SECURE: false,
          SMTP_USER: 'user@test.com',
          SMTP_PASS: 'password',
          SMTP_FROM_NAME: 'EpiTrello',
          SMTP_FROM_EMAIL: '',
        },
      }));

      vi.doMock('../src/utils/logger.js', () => ({
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { sendPasswordResetEmail } = await import('../src/utils/email.js');

      await expect(sendPasswordResetEmail('test@example.com', 'token')).rejects.toThrow(
        'Failed to send password reset email',
      );
    });
  });

  describe('verifyEmailConnection', () => {
    it('returns configured false when SMTP is not configured', async () => {
      vi.doMock('../src/config/env.js', () => ({
        env: {
          NODE_ENV: 'test',
          CLIENT_URL: 'http://localhost:5173',
          SMTP_HOST: '',
          SMTP_PORT: 587,
          SMTP_SECURE: false,
          SMTP_USER: '',
          SMTP_PASS: '',
          SMTP_FROM_NAME: 'EpiTrello',
          SMTP_FROM_EMAIL: '',
        },
      }));

      const { verifyEmailConnection } = await import('../src/utils/email.js');

      const result = await verifyEmailConnection();

      expect(result.configured).toBe(false);
    });

    it('returns connected true when SMTP verification succeeds', async () => {
      vi.doMock('../src/config/env.js', () => ({
        env: {
          NODE_ENV: 'test',
          CLIENT_URL: 'http://localhost:5173',
          SMTP_HOST: 'smtp.test.com',
          SMTP_PORT: 587,
          SMTP_SECURE: false,
          SMTP_USER: 'user@test.com',
          SMTP_PASS: 'password',
          SMTP_FROM_NAME: 'EpiTrello',
          SMTP_FROM_EMAIL: '',
        },
      }));

      vi.doMock('nodemailer', () => ({
        default: {
          createTransport: vi.fn(() => ({
            verify: vi.fn().mockResolvedValue(true),
          })),
          getTestMessageUrl: vi.fn(() => null),
        },
      }));

      const { verifyEmailConnection } = await import('../src/utils/email.js');

      const result = await verifyEmailConnection();

      expect(result.configured).toBe(true);
      expect(result.connected).toBe(true);
    });

    it('returns connected false when SMTP verification fails', async () => {
      vi.doMock('nodemailer', () => ({
        default: {
          createTransport: vi.fn(() => ({
            verify: vi.fn().mockRejectedValue(new Error('Connection failed')),
          })),
          getTestMessageUrl: vi.fn(() => null),
        },
      }));

      vi.doMock('../src/config/env.js', () => ({
        env: {
          NODE_ENV: 'test',
          CLIENT_URL: 'http://localhost:5173',
          SMTP_HOST: 'smtp.test.com',
          SMTP_PORT: 587,
          SMTP_SECURE: false,
          SMTP_USER: 'user@test.com',
          SMTP_PASS: 'password',
          SMTP_FROM_NAME: 'EpiTrello',
          SMTP_FROM_EMAIL: '',
        },
      }));

      vi.doMock('../src/utils/logger.js', () => ({
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { verifyEmailConnection } = await import('../src/utils/email.js');

      const result = await verifyEmailConnection();

      expect(result.configured).toBe(true);
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });
});

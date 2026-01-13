# Environment Variables Reference

This document provides a complete reference for all environment variables used in EpiTrello.

## Overview

EpiTrello uses environment variables for configuration across both backend and frontend. Variables are validated at startup using Zod schemas to ensure correct configuration.

## Backend Variables

Location: `backend/.env`

### Required Variables

| Variable      | Type   | Default                               | Description                               |
| ------------- | ------ | ------------------------------------- | ----------------------------------------- |
| `MONGODB_URI` | string | `mongodb://localhost:27017/epitrello` | MongoDB connection string                 |
| `JWT_SECRET`  | string | -                                     | Secret key for JWT signing (min 16 chars) |

### Optional Variables

| Variable     | Type   | Default                 | Description                                      |
| ------------ | ------ | ----------------------- | ------------------------------------------------ |
| `NODE_ENV`   | enum   | `development`           | Environment: `development`, `test`, `production` |
| `PORT`       | number | `5000`                  | Server port (1024-65535)                         |
| `CLIENT_URL` | string | `http://localhost:5173` | Frontend URL for CORS                            |

### SMTP Configuration (Email)

These variables configure email sending for password reset functionality. If not configured, reset links are logged to the console.

| Variable          | Type    | Default     | Description                   |
| ----------------- | ------- | ----------- | ----------------------------- |
| `SMTP_HOST`       | string  | `""`        | SMTP server hostname          |
| `SMTP_PORT`       | number  | `587`       | SMTP server port              |
| `SMTP_SECURE`     | boolean | `false`     | Use TLS (`true` for port 465) |
| `SMTP_USER`       | string  | `""`        | SMTP authentication username  |
| `SMTP_PASS`       | string  | `""`        | SMTP authentication password  |
| `SMTP_FROM_NAME`  | string  | `EpiTrello` | Sender display name           |
| `SMTP_FROM_EMAIL` | string  | `""`        | Sender email address          |

---

## Frontend Variables

Location: `frontend/.env.local`

| Variable       | Type   | Default                     | Description          |
| -------------- | ------ | --------------------------- | -------------------- |
| `VITE_API_URL` | string | `http://localhost:5000/api` | Backend API base URL |

> Note: Frontend variables must be prefixed with `VITE_` to be exposed to the client bundle.

---

## Environment Files

### Backend

| File           | Purpose                                   |
| -------------- | ----------------------------------------- |
| `.env`         | Development configuration                 |
| `.env.test`    | Test environment (uses in-memory MongoDB) |
| `.env.example` | Template with example values              |

### Frontend

| File           | Purpose                         |
| -------------- | ------------------------------- |
| `.env.local`   | Local development configuration |
| `.env.example` | Template with example values    |

---

## Configuration Examples

### Local Development

**backend/.env:**

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/epitrello
JWT_SECRET=development-secret-key-change-in-production
CLIENT_URL=http://localhost:5173
```

**frontend/.env.local:**

```env
VITE_API_URL=http://localhost:5000/api
```

### Docker Development

**backend/.env:**

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://mongodb:27017/epitrello
JWT_SECRET=development-secret-key-change-in-production
CLIENT_URL=http://localhost:5173
```

> Note: When using Docker, `mongodb` refers to the Docker service name, not `localhost`.

### Production (Fly.io)

Set via Fly.io secrets:

```bash
flyctl secrets set -a epitrello-backend \
  NODE_ENV=production \
  MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/epitrello" \
  JWT_SECRET="your-super-secure-production-secret-minimum-32-chars" \
  CLIENT_URL="https://epitrello-frontend.fly.dev"
```

### With Email Configuration

**backend/.env:**

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/epitrello
JWT_SECRET=development-secret-key-change-in-production
CLIENT_URL=http://localhost:5173

# Gmail SMTP example
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=EpiTrello
SMTP_FROM_EMAIL=your-email@gmail.com
```

> **Gmail Setup:** Use an [App Password](https://support.google.com/accounts/answer/185833) instead of your account password.

### Test Environment

**backend/.env.test:**

```env
NODE_ENV=test
PORT=5001
MONGODB_URI=mongodb://localhost:27017/epitrello-test
JWT_SECRET=test-secret-key-for-testing-only
CLIENT_URL=http://localhost:5173
```

> Note: Tests use `mongodb-memory-server` which overrides `MONGODB_URI` automatically.

---

## Validation Rules

The backend validates environment variables at startup using Zod:

```javascript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM_NAME: z.string().default('EpiTrello'),
  SMTP_FROM_EMAIL: z.string().email().optional().or(z.literal('')).default(''),
});
```

### Validation Errors

If validation fails, the server will not start and will display an error:

```
Error: Environment validation failed: JWT_SECRET: JWT_SECRET must be at least 16 characters
```

---

## Security Best Practices

### JWT_SECRET

- **Minimum length:** 16 characters (32+ recommended for production)
- **Generation:** Use a cryptographically secure random string
- **Rotation:** Rotate periodically in production

Generate a secure secret:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL
openssl rand -hex 64
```

### MONGODB_URI

- **Development:** Local MongoDB is fine
- **Production:** Use MongoDB Atlas with:
  - Strong password
  - IP whitelist (if possible)
  - TLS enabled (default in Atlas)

### SMTP Credentials

- **Gmail:** Use App Passwords, not account passwords
- **Production:** Consider using a transactional email service (SendGrid, Mailgun)
- **Never commit:** Keep credentials out of version control

---

## Troubleshooting

### "Environment validation failed"

**Cause:** Missing or invalid environment variable

**Solution:**

1. Check the error message for the specific variable
2. Verify the value meets the validation rules
3. Ensure the `.env` file is in the correct location

### "MONGODB_URI is required"

**Cause:** Missing MongoDB connection string

**Solution:**

1. Create a `.env` file in the backend directory
2. Add: `MONGODB_URI=mongodb://localhost:27017/epitrello`

### "JWT_SECRET must be at least 16 characters"

**Cause:** JWT secret is too short

**Solution:**

1. Generate a longer secret (32+ characters recommended)
2. Update the `JWT_SECRET` in your `.env` file

### Emails Not Sending

**Cause:** SMTP not configured or misconfigured

**Check:**

1. All SMTP variables are set correctly
2. SMTP_SECURE matches the port (true for 465, false for 587)
3. App password is used for Gmail
4. Less secure apps are enabled (if not using app password)

### Frontend Can't Connect to API

**Cause:** `VITE_API_URL` mismatch

**Solution:**

1. Verify `VITE_API_URL` matches the backend URL
2. Restart the frontend dev server after changing `.env.local`
3. Check CORS configuration in backend (`CLIENT_URL`)

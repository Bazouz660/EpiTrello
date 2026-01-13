# Deployment Guide - Fly.io

This guide explains how to deploy EpiTrello to Fly.io with MongoDB Atlas.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FLY.IO                                      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         Region: Paris (cdg)                         │ │
│  │                                                                     │ │
│  │   ┌─────────────────────┐       ┌─────────────────────┐           │ │
│  │   │      Frontend       │       │       Backend       │           │ │
│  │   │  epitrello-frontend │       │  epitrello-backend  │           │ │
│  │   │    (React/Vite)     │       │   (Node/Express)    │           │ │
│  │   │      Port 80        │       │      Port 8080      │           │ │
│  │   └─────────────────────┘       └──────────┬──────────┘           │ │
│  │                                            │                       │ │
│  └────────────────────────────────────────────┼───────────────────────┘ │
│                                               │                          │
└───────────────────────────────────────────────┼──────────────────────────┘
                                                │
                                                ▼
                              ┌─────────────────────────────────────┐
                              │        MONGODB ATLAS                │
                              │      (Cluster M0 - Free)            │
                              │       epitrello database            │
                              └─────────────────────────────────────┘
```

## Production URLs

| Service      | URL                                          |
| ------------ | -------------------------------------------- |
| Frontend     | https://epitrello-frontend.fly.dev           |
| Backend      | https://epitrello-backend.fly.dev            |
| API          | https://epitrello-backend.fly.dev/api        |
| Health Check | https://epitrello-backend.fly.dev/api/health |

## Prerequisites

- [Fly.io](https://fly.io) account (free tier available)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier available)
- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- GitHub repository with GitHub Actions configured

---

## Initial Setup

### 1. Install Fly CLI

**Windows (PowerShell):**

```powershell
irm https://fly.io/install.ps1 | iex
```

**macOS/Linux:**

```bash
curl -L https://fly.io/install.sh | sh
```

### 2. Authenticate with Fly.io

```bash
flyctl auth login
```

### 3. Create Fly.io Applications

```bash
# Create backend application
flyctl apps create epitrello-backend

# Create frontend application
flyctl apps create epitrello-frontend
```

### 4. Set Up MongoDB Atlas

1. Create an account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (M0 free tier is sufficient)
3. Configure **Database Access**:
   - Create a database user with username and password
   - Grant read/write access to the database
4. Configure **Network Access**:
   - Add `0.0.0.0/0` to allow connections from anywhere
   - This is required for Fly.io's dynamic IP addresses
5. Get the connection string:
   - Click "Connect" → "Connect your application"
   - Copy the connection string

**Connection string format:**

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/epitrello?retryWrites=true&w=majority
```

### 5. Configure Fly.io Secrets

Set environment variables for the backend:

```bash
flyctl secrets set -a epitrello-backend \
  MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/epitrello?retryWrites=true&w=majority" \
  JWT_SECRET="your-jwt-secret-minimum-32-characters-long"
```

**Required secrets:**
| Secret | Description |
|--------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) |

**Optional secrets (for email):**

```bash
flyctl secrets set -a epitrello-backend \
  SMTP_HOST="smtp.example.com" \
  SMTP_PORT="587" \
  SMTP_USER="your-smtp-user" \
  SMTP_PASS="your-smtp-password" \
  SMTP_FROM_NAME="EpiTrello" \
  SMTP_FROM_EMAIL="noreply@example.com"
```

### 6. Generate Deploy Token

1. Go to [fly.io/dashboard](https://fly.io/dashboard)
2. Click your avatar → Account → Access Tokens
3. Create a new **Org deploy token**
4. Copy the token

### 7. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions:

| Secret          | Description                  |
| --------------- | ---------------------------- |
| `FLY_API_TOKEN` | The deploy token from step 6 |

---

## Configuration Files

### Backend (`backend/fly.toml`)

```toml
app = 'epitrello-backend'
primary_region = 'cdg'

[build]
  dockerfile = 'Dockerfile'

[env]
  NODE_ENV = 'production'
  PORT = '8080'

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[http_service.checks]]
  grace_period = '10s'
  interval = '30s'
  method = 'GET'
  timeout = '5s'
  path = '/api/health'

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

### Frontend (`frontend/fly.toml`)

```toml
app = 'epitrello-frontend'
primary_region = 'cdg'

[build]
  dockerfile = 'Dockerfile'
  [build.args]
    VITE_API_URL = 'https://epitrello-backend.fly.dev/api'

[http_service]
  internal_port = 80
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

---

## Automated Deployment (CI/CD)

### GitHub Actions Workflow

The `.github/workflows/cd.yml` workflow automatically deploys on push to `main` or `dev`:

**Pipeline Steps:**

1. **Test** - Run linting and unit tests
2. **Deploy Backend** - Build and deploy to Fly.io
3. **Deploy Frontend** - Build and deploy to Fly.io
4. **Health Check** - Verify backend is responding

### Environments

| Branch | Environment | Apps                                          |
| ------ | ----------- | --------------------------------------------- |
| `main` | Production  | epitrello-backend, epitrello-frontend         |
| `dev`  | Development | epitrello-backend-dev, epitrello-frontend-dev |

### Manual Deployment Trigger

1. Go to GitHub → Actions → CD
2. Click **"Run workflow"**
3. Select the environment (dev/production)
4. Click **"Run workflow"**

---

## Manual Deployment

### Deploy Backend

```bash
cd backend
flyctl deploy --remote-only --app epitrello-backend --ha=false
```

### Deploy Frontend

```bash
cd frontend
flyctl deploy --remote-only --app epitrello-frontend \
  --build-arg VITE_API_URL=https://epitrello-backend.fly.dev/api \
  --ha=false
```

> Note: `--ha=false` disables high availability to stay within free tier limits.

---

## Useful Commands

### Application Management

```bash
# List all applications
flyctl apps list

# View application status
flyctl status -a epitrello-backend

# Open application in browser
flyctl open -a epitrello-frontend

# Restart an application
flyctl apps restart epitrello-backend
```

### Logs and Debugging

```bash
# View real-time logs
flyctl logs -a epitrello-backend

# View frontend logs
flyctl logs -a epitrello-frontend

# SSH into a running machine
flyctl ssh console -a epitrello-backend
```

### Secrets Management

```bash
# List configured secrets
flyctl secrets list -a epitrello-backend

# Set a new secret
flyctl secrets set -a epitrello-backend KEY=value

# Remove a secret
flyctl secrets unset -a epitrello-backend KEY
```

### Configuration

```bash
# View application configuration
flyctl config show -a epitrello-backend

# View machine configuration
flyctl machine list -a epitrello-backend
```

---

## Monitoring

### Fly.io Dashboard

Monitor your applications at:

- Backend: [fly.io/apps/epitrello-backend](https://fly.io/apps/epitrello-backend)
- Frontend: [fly.io/apps/epitrello-frontend](https://fly.io/apps/epitrello-frontend)

### Health Check

```bash
curl https://epitrello-backend.fly.dev/api/health
```

**Expected response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T12:00:00.000Z",
  "uptime": 3600
}
```

---

## Troubleshooting

### Application Won't Start

1. Check the logs:

   ```bash
   flyctl logs -a epitrello-backend
   ```

2. Verify configuration:

   ```bash
   flyctl config show -a epitrello-backend
   ```

3. Check secrets are set:
   ```bash
   flyctl secrets list -a epitrello-backend
   ```

### MongoDB Connection Errors

1. Verify `MONGODB_URI` is correctly set:

   ```bash
   flyctl secrets list -a epitrello-backend
   ```

2. Check MongoDB Atlas Network Access:
   - Ensure `0.0.0.0/0` is in the IP whitelist
   - Or add Fly.io's IP ranges

3. Verify database user credentials in MongoDB Atlas

### "Unauthorized" Error in CD Pipeline

1. Regenerate deploy token at [fly.io/dashboard](https://fly.io/dashboard)
2. Update `FLY_API_TOKEN` secret in GitHub repository
3. Re-run the workflow

### Application Stops After Inactivity

This is expected behavior with `auto_stop_machines = 'stop'`. Machines automatically restart on the first request (2-3 second latency).

**To keep a machine always running:**

```toml
min_machines_running = 1
```

> Note: This will increase costs beyond the free tier.

### Slow Initial Response

Cold starts take 2-5 seconds. Solutions:

1. Set `min_machines_running = 1`
2. Use a health check service to keep the app warm
3. Accept the latency for free tier usage

---

## Cost Optimization

### Free Tier Limits

Fly.io's free tier includes:

- 3 shared-cpu-1x machines (256MB RAM each)
- 160GB outbound transfer per month
- Unlimited inbound transfer

### Current Configuration

| Resource | Usage                  | Free Tier  |
| -------- | ---------------------- | ---------- |
| Machines | 2 (backend + frontend) | 3          |
| Memory   | 256MB each             | 256MB each |
| CPU      | Shared                 | Shared     |

### Cost-Saving Tips

1. **Use auto-stop** - Machines stop when idle
2. **Single region** - Deploy to one region only
3. **Disable HA** - Use `--ha=false` for single-instance deployment
4. **Monitor usage** - Check dashboard for resource consumption

---

## Scaling

### Horizontal Scaling

```bash
# Scale to 2 machines
flyctl scale count 2 -a epitrello-backend

# Scale back to 1
flyctl scale count 1 -a epitrello-backend
```

### Vertical Scaling

```bash
# Upgrade to more memory
flyctl scale memory 512 -a epitrello-backend

# View available configurations
flyctl platform vm-sizes
```

### Multi-Region Deployment

Add regions to `fly.toml`:

```toml
primary_region = 'cdg'
# Additional regions can be added via CLI
```

```bash
# Add a region
flyctl regions add iad -a epitrello-backend

# List regions
flyctl regions list -a epitrello-backend
```

---

## Security Best Practices

1. **Rotate secrets regularly** - Update JWT_SECRET periodically
2. **Use strong secrets** - Generate random strings for JWT_SECRET
3. **Limit database access** - Use specific IP ranges instead of 0.0.0.0/0 if possible
4. **Monitor logs** - Watch for suspicious activity
5. **Enable HTTPS only** - Already configured with `force_https = true`

---

## Backup and Recovery

### Database Backup

MongoDB Atlas handles backups automatically on paid tiers. For free tier:

1. Use `mongodump` for manual backups
2. Consider upgrading to M2+ for automated backups
3. Export critical data regularly

### Application Recovery

```bash
# Redeploy from latest successful build
flyctl deploy --remote-only -a epitrello-backend

# Rollback to previous release
flyctl releases list -a epitrello-backend
flyctl releases rollback <version> -a epitrello-backend
```

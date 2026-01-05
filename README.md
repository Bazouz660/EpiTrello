# EpiTrello

EpiTrello is a Trello-inspired Kanban application that enables collaborative task management with real-time updates. This repository hosts both the frontend React client and the backend Node.js API.

## Project Structure

```
.
├── backend/          # Express + MongoDB API server
├── frontend/         # React + Vite client
├── docker-compose.yml
├── eslint.config.js
├── prettier.config.cjs
└── .husky/           # Git hooks configuration
```

### Backend

- Node.js (ESM) with Express, Socket.io, and Mongoose
- Environment validation via Zod (`backend/src/config/env.js`)
- Modular folder layout for models, routes, controllers, middleware, and utilities
- Vitest configured for unit testing with coverage thresholds
- Authenticated profile endpoints for reading, updating, and securing user accounts (avatars + password rotation)

### Frontend

- React 19 with Vite, Tailwind CSS, Redux Toolkit, React Router, dnd-kit, and axios
- Centralized store setup in `frontend/src/app/store.js`
- Configured router with placeholder pages for upcoming features
- Tailwind CSS ready with global styles and theme extensions
- Dedicated profile management page with avatar upload, form validation, and password change flows

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run tests**

   ```bash
   npm test
   ```

3. **Lint the codebase**

   ```bash
   npm run lint
   ```

4. **Format check**
   ```bash
   npm run format
   ```

## Development Environments

### Backend

- Copy `backend/.env.example` to `.env` and adjust secrets as needed.
- Start the server locally with:
  ```bash
  cd backend
  npm run dev
  ```

### Frontend

- Copy `frontend/.env.example` to `.env.local` and adjust the API URL if necessary.
- Start the Vite dev server:
  ```bash
  cd frontend
  npm run dev
  ```

## Docker

Use the provided compose file to start MongoDB, the backend API, and the frontend client together:

```bash
docker compose up --build
```

The services will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- MongoDB: mongodb://localhost:27017

## Continuous Integration & Deployment

GitHub Actions workflows automate the development lifecycle:

### CI (`ci.yml`)

- Runs on every push/PR to `main` and `dev`
- Linting, testing, and coverage checks

### CD (`cd.yml`)

- Runs on push to `main` and `dev`
- Deploys to **Fly.io** automatically
- Backend + Frontend deployment with health checks

### Production URLs

| Service      | URL                                          |
| ------------ | -------------------------------------------- |
| Frontend     | https://epitrello-frontend.fly.dev           |
| Backend API  | https://epitrello-backend.fly.dev/api        |
| Health Check | https://epitrello-backend.fly.dev/api/health |

For deployment details, see [doc/deployment-flyio.md](doc/deployment-flyio.md).

## Testing & Coverage

- Vitest powers both frontend and backend test suites.
- Coverage thresholds are enforced at 90/80/80/90 for statements/branches/functions/lines to satisfy the >90% requirement.

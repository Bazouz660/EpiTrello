# System Architecture

EpiTrello follows a client-server architecture with a focus on real-time collaboration.

## High-Level Overview

- **Frontend**: React 19, Redux Toolkit for state management, React Router for navigation, Tailwind CSS for styling, and dnd-kit for drag-and-drop interactions.
- **Backend**: Node.js (ES modules) with Express for the REST API, Socket.io for real-time updates, Mongoose for MongoDB access, and JWT for authentication.
- **Database**: MongoDB with schemas designed for boards, lists, and cards.
- **Communication**:
  - HTTP REST API for CRUD operations.
  - Socket.io channels for board updates, card movements, and collaborative edits.
- **Security**:
  - JWT access tokens with refresh strategies planned for later sprints.
  - Input validation via Zod schemas at the API boundary.
  - Helmet, CORS, and body parsing middleware pre-configured.
  - Future CSRF/XSS mitigation through sanitisation, HTTP-only cookies, and content security policies.

## Application Layers (Backend)

1. **Routes**: REST endpoints (to be implemented in Sprint 1).
2. **Controllers**: Request handling, bridging HTTP to services.
3. **Services**: Business logic and domain orchestration.
4. **Models**: Mongoose schemas and data access abstractions.
5. **Middleware**: Authentication, validation, and error handling.
6. **Socket Gateway**: Real-time channel registration.

## Frontend Composition

- **Pages**: High-level views mapped to routes.
- **Components**: Reusable UI elements and layout primitives.
- **Features**: Redux slices and domain-specific components.
- **Services**: API clients, data fetching utilities, and caching adapters.
- **Hooks**: Custom hooks for shared behaviour.

## Performance Targets

- Initial load under 3 seconds by code-splitting future routes and lazy-loading boards.
- Real-time events under 500 ms using Socket.io acknowledgments and optimistic updates.
- Static assets served via CDN-ready build output.

## DevOps & Tooling

- Docker Compose orchestrates MongoDB, backend, and frontend containers for local development.
- GitHub Actions workflows:
  - **CI**: Validates lint, test, and coverage gates on every push/PR.
  - **CD**: Automated deployment to Fly.io on push to `main` or `dev`.
- Husky + lint-staged enforce code quality pre-commit.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GITHUB                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   Push to   │───▶│     CI      │───▶│         CD          │ │
│  │  main/dev   │    │ (lint/test) │    │ (deploy to Fly.io)  │ │
│  └─────────────┘    └─────────────┘    └──────────┬──────────┘ │
└───────────────────────────────────────────────────┼─────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                          FLY.IO                                  │
│                                                                  │
│   ┌─────────────────────┐       ┌─────────────────────┐        │
│   │      Frontend       │       │       Backend       │        │
│   │  epitrello-frontend │◄─────▶│  epitrello-backend  │        │
│   │    (React/Vite)     │       │   (Node/Express)    │        │
│   └─────────────────────┘       └──────────┬──────────┘        │
│                                            │                    │
└────────────────────────────────────────────┼────────────────────┘
                                             │
                                             ▼
                           ┌─────────────────────────────────┐
                           │        MONGODB ATLAS            │
                           │      (Cloud Database)           │
                           └─────────────────────────────────┘
```

### Production URLs

| Service  | URL                                   |
| -------- | ------------------------------------- |
| Frontend | https://epitrello-frontend.fly.dev    |
| Backend  | https://epitrello-backend.fly.dev     |
| API      | https://epitrello-backend.fly.dev/api |

For detailed deployment instructions, see [deployment-flyio.md](deployment-flyio.md).

# System Architecture

EpiTrello follows a modern client-server architecture with a focus on real-time collaboration, scalability, and developer experience.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        React 19 Application                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Pages     │  │ Components  │  │  Features   │  │   Services  │  │  │
│  │  │  (Routes)   │  │ (Reusable)  │  │  (Redux)    │  │ (API/WS)    │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                            │                     │
                      HTTP REST API          WebSocket
                            │                     │
                            ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER LAYER                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Express.js Application                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Routes    │  │ Controllers │  │  Middleware │  │  Socket.IO  │  │  │
│  │  │             │  │             │  │  (Auth/Err) │  │  (Realtime) │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                   MongoDB (via Mongoose ODM)                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │
│  │  │  Users   │  │  Boards  │  │  Lists   │  │  Cards   │  │ Notifs  │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

- **React 19** - UI framework with latest concurrent features
- **Redux Toolkit** - Centralized state management with slices pattern
- **React Router 7** - Client-side routing with nested layouts
- **Tailwind CSS 3** - Utility-first CSS framework
- **dnd-kit** - Accessible drag-and-drop for lists and cards
- **Axios** - HTTP client for REST API calls
- **Socket.io Client** - Real-time bidirectional communication

### Backend

- **Node.js (ESM)** - JavaScript runtime with ES modules
- **Express 4** - Minimal web framework for REST API
- **Socket.io 4** - Real-time WebSocket server
- **Mongoose 8** - MongoDB object modeling
- **JWT (jsonwebtoken)** - Stateless authentication tokens
- **Zod** - TypeScript-first schema validation
- **Bcrypt** - Secure password hashing
- **Nodemailer** - Email sending capabilities

### Database

- **MongoDB** - Document-oriented NoSQL database
- **MongoDB Atlas** - Cloud-hosted database for production

## Backend Architecture

### Directory Structure

```
backend/src/
├── app.js              # Express app configuration
├── server.js           # HTTP server + Socket.io initialization
├── config/
│   ├── db.js          # MongoDB connection
│   └── env.js         # Environment validation (Zod)
├── controllers/        # Request handlers
│   ├── authController.js
│   ├── boardsController.js
│   ├── cardsController.js
│   ├── listsController.js
│   ├── notificationsController.js
│   └── usersController.js
├── middleware/
│   ├── auth.js        # JWT authentication
│   └── errorHandlers.js
├── models/             # Mongoose schemas
│   ├── Board.js
│   ├── Card.js
│   ├── List.js
│   ├── Notification.js
│   └── User.js
├── routes/             # API route definitions
│   ├── auth.js
│   ├── boards.js
│   ├── cards.js
│   ├── lists.js
│   ├── notifications.js
│   └── users.js
├── socket/
│   └── index.js       # WebSocket event handlers
└── utils/
    ├── crypto.js      # Password hashing utilities
    ├── email.js       # Email sending utilities
    ├── logger.js      # Logging utilities
    ├── passwordStrength.js
    └── userSerializer.js
```

### Application Layers

1. **Routes Layer**
   - Defines API endpoints and HTTP methods
   - Maps URLs to controller functions
   - Applies authentication middleware

2. **Controllers Layer**
   - Handles HTTP request/response cycle
   - Validates input data
   - Orchestrates business logic
   - Returns appropriate HTTP status codes

3. **Models Layer**
   - Mongoose schemas with validation
   - Data access and persistence
   - Indexes for query optimization

4. **Middleware Layer**
   - `authenticate` - JWT token verification
   - `notFoundHandler` - 404 responses
   - `errorHandler` - Global error handling

5. **Socket Gateway**
   - JWT-authenticated connections
   - Room-based event broadcasting
   - Active user tracking per board

### Middleware Pipeline

```
Request → Helmet → CORS → Compression → Body Parser → Morgan → Routes
                                                           ↓
                                                   Authentication
                                                           ↓
                                                    Controller
                                                           ↓
                                                  Error Handler
                                                           ↓
                                                      Response
```

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── App.jsx             # Root component with layout
├── router.jsx          # Route configuration
├── main.jsx           # Application entry point
├── app/
│   └── store.js       # Redux store configuration
├── components/
│   ├── boards/        # Board-specific components
│   ├── cards/         # Card-specific components
│   ├── common/        # Shared UI components
│   ├── dnd/           # Drag-and-drop components
│   └── notifications/ # Notification components
├── features/
│   ├── auth/          # Authentication slice + components
│   ├── boards/        # Boards slice + components
│   ├── cards/         # Cards slice + components
│   ├── lists/         # Lists slice + components
│   ├── notifications/ # Notifications slice + components
│   ├── profile/       # Profile management
│   └── socket/        # Socket connection slice
├── hooks/             # Custom React hooks
├── pages/             # Route page components
├── services/
│   ├── httpClient.js  # Axios configuration
│   └── socketService.js # Socket.io client
└── utils/             # Helper utilities
```

### State Management

Redux Toolkit is used with the following slices:

| Slice           | Purpose                                     |
| --------------- | ------------------------------------------- |
| `auth`          | User authentication state, token management |
| `boards`        | Board listing and active board data         |
| `lists`         | Lists within the active board               |
| `cards`         | Cards data and operations                   |
| `notifications` | User notifications                          |
| `socket`        | WebSocket connection state                  |

### Component Composition

- **Pages** - High-level views mapped to routes
- **Features** - Domain-specific components with Redux integration
- **Components** - Reusable UI primitives and layout elements
- **Hooks** - Shared stateful logic (e.g., `useBoardSocket`)

### Protected Routes

```jsx
<ProtectedRoute>
  ├── /boards → BoardsPage ├── /boards/:boardId → BoardViewPage ├── /profile → ProfilePage └──
  /notifications → NotificationsPage
</ProtectedRoute>
```

## Real-Time Communication

### WebSocket Architecture

```
┌──────────────┐                    ┌──────────────┐
│   Client 1   │◄──────────────────►│              │
│  (Browser)   │                    │              │
└──────────────┘                    │              │
                                    │   Socket.IO  │
┌──────────────┐                    │    Server    │
│   Client 2   │◄──────────────────►│              │
│  (Browser)   │                    │              │
└──────────────┘                    │              │
                                    └──────────────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │   MongoDB    │
                                    └──────────────┘
```

### Room-Based Broadcasting

- **User Rooms** (`user:{userId}`) - Personal notifications
- **Board Rooms** (`board:{boardId}`) - Board-specific updates

### Event Flow Example (Card Creation)

```
1. Client A sends HTTP POST /api/cards
2. Server creates card in MongoDB
3. Server broadcasts 'card:created' to board room
4. Clients B, C receive event and update local state
5. Client A receives HTTP response
```

## Security

### Authentication Flow

```
1. User submits credentials (POST /api/auth/login)
2. Server validates and returns JWT token (7-day expiry)
3. Client stores token and sets Authorization header
4. Subsequent requests include Bearer token
5. Middleware validates token on protected routes
```

### Security Measures

| Measure           | Implementation              |
| ----------------- | --------------------------- |
| Password Hashing  | bcrypt with salt rounds     |
| Password Strength | zxcvbn library validation   |
| Token Security    | JWT with 16+ char secret    |
| Request Security  | Helmet middleware (headers) |
| CORS              | Configured origin whitelist |
| Input Validation  | Zod schemas at API boundary |
| Rate Limiting     | Planned for future sprints  |

### Role-Based Access Control

| Role     | Permissions                                    |
| -------- | ---------------------------------------------- |
| `owner`  | Full control, delete board, manage all members |
| `admin`  | Edit board, manage members (except owner)      |
| `member` | Create/edit/delete cards and lists             |
| `viewer` | Read-only access                               |

## Performance Considerations

### Targets

- Initial load: < 3 seconds
- Real-time events: < 500ms latency
- API responses: < 200ms (p95)

### Optimizations

**Frontend:**

- Code splitting with React.lazy
- Optimistic UI updates
- Redux state normalization
- Tailwind CSS purging

**Backend:**

- MongoDB compound indexes
- Connection pooling
- Response compression (gzip)
- Efficient query projections

**Infrastructure:**

- CDN-ready static build
- Auto-scaling Fly.io machines
- MongoDB Atlas auto-indexing

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

### Environments

| Environment | Branch | Purpose                      |
| ----------- | ------ | ---------------------------- |
| Development | `dev`  | Testing new features         |
| Production  | `main` | Live user-facing application |

### Production URLs

| Service      | URL                                          |
| ------------ | -------------------------------------------- |
| Frontend     | https://epitrello-frontend.fly.dev           |
| Backend      | https://epitrello-backend.fly.dev            |
| API          | https://epitrello-backend.fly.dev/api        |
| Health Check | https://epitrello-backend.fly.dev/api/health |

## DevOps & Tooling

### CI/CD Pipeline

**Continuous Integration (on PRs):**

1. Lint check (ESLint)
2. Format check (Prettier)
3. Unit tests (Vitest)
4. Coverage enforcement (90%+)

**Continuous Deployment (on merge):**

1. Build Docker images
2. Deploy backend to Fly.io
3. Deploy frontend to Fly.io
4. Health check verification

### Local Development

**Docker Compose** orchestrates:

- MongoDB container
- Backend API container
- Frontend dev server container

### Code Quality

| Tool        | Purpose              |
| ----------- | -------------------- |
| ESLint      | JavaScript linting   |
| Prettier    | Code formatting      |
| Husky       | Pre-commit hooks     |
| lint-staged | Staged files linting |
| Vitest      | Unit testing         |

## Future Considerations

- **Microservices**: Split notifications into separate service
- **Caching**: Redis for session storage and caching
- **Search**: Elasticsearch for advanced card search
- **File Storage**: S3 for card attachments
- **Monitoring**: APM integration (DataDog/New Relic)
- **Load Balancing**: Multiple backend instances

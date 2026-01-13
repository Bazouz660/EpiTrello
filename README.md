# EpiTrello

EpiTrello is a full-featured, Trello-inspired Kanban application that enables collaborative task management with real-time updates. Built with modern web technologies, it provides a seamless experience for teams to organize projects, track tasks, and collaborate in real-time.

## ✨ Features

### Core Features

- **Board Management** - Create, edit, and delete boards with customizable backgrounds
- **List Organization** - Organize tasks in lists with drag-and-drop reordering
- **Card Management** - Full-featured cards with titles, descriptions, labels, due dates, and checklists
- **Real-time Collaboration** - See changes instantly via WebSocket connections
- **User Authentication** - Secure JWT-based authentication with password reset functionality
- **Team Collaboration** - Add members to boards with role-based access (owner, admin, member, viewer)

### Advanced Features

- **Card Comments** - Add comments to cards with @mention support
- **Notifications** - Real-time notifications for assignments, mentions, and comments
- **Activity Tracking** - Board and card activity history
- **User Profiles** - Customizable profiles with avatar upload
- **Search** - Search for users to add to boards
- **Cursor Tracking** - See collaborators' cursor positions in real-time

## 🏗️ Project Structure

```
epitrello/
├── backend/                 # Express + MongoDB API server
│   ├── src/
│   │   ├── config/         # Environment and database configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth and error handling middleware
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API route definitions
│   │   ├── socket/         # WebSocket event handlers
│   │   └── utils/          # Helper utilities
│   └── tests/              # Backend test suite
├── frontend/               # React + Vite client
│   ├── src/
│   │   ├── app/           # Redux store configuration
│   │   ├── components/    # Reusable UI components
│   │   ├── features/      # Redux slices and domain components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Route page components
│   │   ├── services/      # API and WebSocket clients
│   │   └── utils/         # Helper utilities
│   └── tests/             # Frontend test suite
├── doc/                    # Project documentation
└── docker-compose.yml      # Local development orchestration
```

## 🛠️ Tech Stack

### Backend

| Technology  | Purpose                           |
| ----------- | --------------------------------- |
| Node.js 18+ | Runtime environment (ESM)         |
| Express 4   | REST API framework                |
| MongoDB     | Document database                 |
| Mongoose 8  | ODM for MongoDB                   |
| Socket.io 4 | Real-time WebSocket communication |
| JWT         | Authentication tokens             |
| Zod         | Request validation                |
| Bcrypt      | Password hashing                  |
| Nodemailer  | Email functionality               |

### Frontend

| Technology       | Purpose                    |
| ---------------- | -------------------------- |
| React 19         | UI framework               |
| Vite 7           | Build tool and dev server  |
| Redux Toolkit    | State management           |
| React Router 7   | Client-side routing        |
| Tailwind CSS 3   | Utility-first styling      |
| dnd-kit          | Drag-and-drop interactions |
| Axios            | HTTP client                |
| Socket.io Client | Real-time updates          |

### DevOps & Tooling

| Tool                    | Purpose                      |
| ----------------------- | ---------------------------- |
| Docker & Docker Compose | Local development containers |
| GitHub Actions          | CI/CD pipelines              |
| Fly.io                  | Cloud deployment platform    |
| Vitest                  | Testing framework            |
| ESLint + Prettier       | Code quality and formatting  |
| Husky                   | Git hooks                    |

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.18
- npm >= 9
- MongoDB (local or cloud instance)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/epitrello.git
   cd epitrello
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Backend (`backend/.env`):

   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/epitrello
   JWT_SECRET=your-secret-key-min-16-characters
   CLIENT_URL=http://localhost:5173

   # Optional: Email configuration
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-smtp-user
   SMTP_PASS=your-smtp-password
   SMTP_FROM_NAME=EpiTrello
   SMTP_FROM_EMAIL=noreply@epitrello.com
   ```

   Frontend (`frontend/.env.local`):

   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start development servers**

   Using Docker (recommended):

   ```bash
   docker compose up --build
   ```

   Or manually:

   ```bash
   # Terminal 1: Start backend
   cd backend && npm run dev

   # Terminal 2: Start frontend
   cd frontend && npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api
   - MongoDB: mongodb://localhost:27017

## 📝 Available Scripts

### Root Level (Monorepo)

```bash
npm test          # Run all tests
npm run lint      # Lint all workspaces
npm run format    # Check formatting
npm run prepare   # Setup Husky hooks
```

### Backend

```bash
cd backend
npm run dev       # Start with hot reload
npm start         # Production start
npm test          # Run tests
npm run test:ci   # Run tests (CI mode)
npm run test:coverage  # Run with coverage
npm run lint      # Lint source code
```

### Frontend

```bash
cd frontend
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm test          # Run tests
npm run test:ci   # Run tests (CI mode)
npm run test:coverage  # Run with coverage
npm run lint      # Lint source code
```

## 🐳 Docker

Use Docker Compose to spin up the entire stack locally:

```bash
# Start all services
docker compose up --build

# Run in background
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f
```

Services:
| Service | Port | Description |
|---------|------|-------------|
| frontend | 5173 | React application |
| backend | 5000 | Express API server |
| mongodb | 27017 | MongoDB database |

## 🧪 Testing

Both frontend and backend use Vitest for testing with coverage thresholds enforced at:

- Statements: 90%
- Branches: 80%
- Functions: 80%
- Lines: 90%

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode (development)
cd backend && npm test
cd frontend && npm test
```

## 🔄 CI/CD Pipeline

### Continuous Integration (`ci.yml`)

Runs on every pull request to `main` and `dev`:

1. Install dependencies
2. Run linters
3. Execute test suite
4. Enforce coverage thresholds

### Continuous Deployment (`cd.yml`)

Runs on push to `main` or `dev`:

1. Run test suite
2. Deploy backend to Fly.io
3. Deploy frontend to Fly.io
4. Health check verification

### Manual Deployment

Trigger via GitHub Actions → CD → Run workflow → Select environment

## 🌐 Production URLs

| Service      | URL                                          |
| ------------ | -------------------------------------------- |
| Frontend     | https://epitrello-frontend.fly.dev           |
| Backend API  | https://epitrello-backend.fly.dev/api        |
| Health Check | https://epitrello-backend.fly.dev/api/health |

## 📚 Documentation

- [Architecture Overview](doc/architecture.md) - System design and components
- [Data Models](doc/data-models.md) - MongoDB schema documentation
- [API Reference](doc/api-reference.md) - REST API endpoints
- [WebSocket Events](doc/websocket-events.md) - Real-time event documentation
- [Environment Variables](doc/environment-variables.md) - Configuration reference
- [Testing Guide](doc/testing.md) - Writing and running tests
- [Deployment Guide](doc/deployment-flyio.md) - Fly.io deployment instructions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality

- All code must pass ESLint and Prettier checks
- Tests are required for new features
- Coverage thresholds must be maintained
- Husky pre-commit hooks enforce standards

## 📄 License

This project is licensed under the MIT License.

# Testing Guide

This document covers testing practices, setup, and patterns used in EpiTrello.

## Overview

EpiTrello uses **Vitest** as the testing framework for both frontend and backend. Tests are run automatically in CI and coverage thresholds are enforced.

## Test Stack

| Tool                                                                    | Purpose                           |
| ----------------------------------------------------------------------- | --------------------------------- |
| [Vitest](https://vitest.dev/)                                           | Test runner and assertion library |
| [Testing Library](https://testing-library.com/)                         | React component testing           |
| [MSW](https://mswjs.io/)                                                | API mocking for frontend          |
| [Supertest](https://github.com/ladjs/supertest)                         | HTTP testing for backend          |
| [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) | In-memory MongoDB for tests       |

---

## Running Tests

### All Tests (Monorepo)

```bash
# Run all tests once
npm test

# Run with coverage
npm run test:coverage
```

### Backend Tests

```bash
cd backend

# Watch mode (development)
npm test

# Single run (CI)
npm run test:ci

# With coverage report
npm run test:coverage
```

### Frontend Tests

```bash
cd frontend

# Watch mode (development)
npm test

# Single run (CI)
npm run test:ci

# With coverage report
npm run test:coverage
```

---

## Coverage Requirements

Coverage thresholds are enforced in CI. PRs that don't meet thresholds will fail.

| Metric     | Backend | Frontend |
| ---------- | ------- | -------- |
| Statements | 90%     | 90%      |
| Branches   | 80%     | 80%      |
| Functions  | 80%     | 80%      |
| Lines      | 90%     | 90%      |

### Viewing Coverage Reports

After running `npm run test:coverage`:

```bash
# Backend coverage
open backend/coverage/lcov-report/index.html

# Frontend coverage
open frontend/coverage/lcov-report/index.html
```

---

## Backend Testing

### Setup

The backend uses `mongodb-memory-server` for an isolated in-memory database:

**vitest.setup.js:**

```javascript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

### Test Structure

```
backend/tests/
├── auth.test.js          # Authentication endpoints
├── boards.test.js        # Board CRUD and members
├── cards.test.js         # Card operations
├── lists.test.js         # List operations
├── notifications.test.js # Notification system
├── users.test.js         # User profile management
├── crypto.test.js        # Password hashing utilities
├── email.test.js         # Email utilities
├── env.test.js           # Environment validation
├── errorHandlers.test.js # Error middleware
├── logger.test.js        # Logging utilities
└── helpers/
    └── setupTestDatabase.js
```

### Writing Backend Tests

**Example: Testing an API endpoint**

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/utils/crypto.js';

describe('POST /api/auth/login', () => {
  let testUser;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: await hashPassword('SecurePassword123!'),
    });
  });

  it('should return token on valid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'SecurePassword123!',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe('test@example.com');
  });

  it('should return 401 on invalid password', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'WrongPassword123!',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('should return 400 when email is missing', async () => {
    const response = await request(app).post('/api/auth/login').send({
      password: 'SecurePassword123!',
    });

    expect(response.status).toBe(400);
  });
});
```

**Example: Testing with authentication**

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Board } from '../src/models/Board.js';
import { env } from '../src/config/env.js';

describe('GET /api/boards', () => {
  let user, token;

  beforeEach(async () => {
    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword123',
    });

    token = jwt.sign({ sub: user._id.toString() }, env.JWT_SECRET);

    await Board.create({
      title: 'Test Board',
      owner: user._id,
    });
  });

  it('should return user boards', async () => {
    const response = await request(app).get('/api/boards').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.boards).toHaveLength(1);
    expect(response.body.boards[0].title).toBe('Test Board');
  });

  it('should return 401 without token', async () => {
    const response = await request(app).get('/api/boards');

    expect(response.status).toBe(401);
  });
});
```

**Example: Testing utilities**

```javascript
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/utils/crypto.js';

describe('crypto utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'MySecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt format
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password', async () => {
      const password = 'MySecurePassword123!';
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await hashPassword('CorrectPassword123!');

      const result = await verifyPassword('WrongPassword123!', hash);
      expect(result).toBe(false);
    });
  });
});
```

---

## Frontend Testing

### Setup

**vitest.config.js:**

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 80,
        lines: 90,
      },
    },
  },
});
```

**src/tests/setup.js:**

```javascript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

### Test Structure

```
frontend/src/
├── App.test.jsx
├── components/
│   ├── ConnectionStatus.test.jsx
│   ├── MentionTextarea.test.jsx
│   ├── ProtectedRoute.test.jsx
│   └── cards/
│       └── CardListItem.test.jsx
├── pages/
│   └── BoardsPage.test.jsx
└── tests/
    └── setup.js
```

### Writing Frontend Tests

**Example: Testing a component**

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CardListItem from './CardListItem';

const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      // Add your reducers
    },
    preloadedState,
  });
};

describe('CardListItem', () => {
  const mockCard = {
    id: '123',
    title: 'Test Card',
    description: 'Test description',
    labels: [{ color: '#ef4444', text: 'Bug' }],
    dueDate: '2026-02-01',
  };

  it('renders card title', () => {
    render(
      <Provider store={createTestStore()}>
        <CardListItem card={mockCard} />
      </Provider>,
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('renders labels', () => {
    render(
      <Provider store={createTestStore()}>
        <CardListItem card={mockCard} />
      </Provider>,
    );

    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Provider store={createTestStore()}>
        <CardListItem card={mockCard} onClick={onClick} />
      </Provider>,
    );

    await user.click(screen.getByText('Test Card'));
    expect(onClick).toHaveBeenCalledWith(mockCard);
  });
});
```

**Example: Testing with React Router**

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProtectedRoute from './ProtectedRoute';

const renderWithRouter = (ui, { route = '/', store } = {}) => {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>,
  );
};

describe('ProtectedRoute', () => {
  it('redirects to login when not authenticated', () => {
    const store = configureStore({
      reducer: {
        auth: () => ({ token: null, user: null }),
      },
    });

    renderWithRouter(
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
      </Routes>,
      { route: '/dashboard', store },
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    const store = configureStore({
      reducer: {
        auth: () => ({ token: 'valid-token', user: { id: '123' } }),
      },
    });

    renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
      </Routes>,
      { route: '/dashboard', store },
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
```

**Example: Mocking API calls with MSW**

```jsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';
import { store } from '../app/store';
import BoardsPage from './BoardsPage';

const server = setupServer(
  http.get('/api/boards', () => {
    return HttpResponse.json({
      boards: [
        { id: '1', title: 'Board 1' },
        { id: '2', title: 'Board 2' },
      ],
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('BoardsPage', () => {
  it('displays boards from API', async () => {
    render(
      <Provider store={store}>
        <BoardsPage />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Board 1')).toBeInTheDocument();
      expect(screen.getByText('Board 2')).toBeInTheDocument();
    });
  });

  it('handles API error', async () => {
    server.use(
      http.get('/api/boards', () => {
        return HttpResponse.json({ message: 'Server error' }, { status: 500 });
      }),
    );

    render(
      <Provider store={store}>
        <BoardsPage />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

---

## Testing Patterns

### AAA Pattern (Arrange, Act, Assert)

```javascript
it('should add a card to the list', async () => {
  // Arrange
  const list = await List.create({ title: 'To Do', board: boardId, position: 0 });

  // Act
  const response = await request(app)
    .post('/api/cards')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'New Card', list: list._id });

  // Assert
  expect(response.status).toBe(201);
  expect(response.body.card.title).toBe('New Card');
});
```

### Test Isolation

Each test should be independent:

```javascript
beforeEach(async () => {
  // Reset state before each test
  await User.deleteMany({});
  await Board.deleteMany({});
});
```

### Testing Edge Cases

```javascript
describe('card title validation', () => {
  it('rejects empty title', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', list: listId });

    expect(response.status).toBe(400);
  });

  it('rejects title over 120 characters', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'a'.repeat(121), list: listId });

    expect(response.status).toBe(400);
  });

  it('accepts title at exactly 120 characters', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'a'.repeat(120), list: listId });

    expect(response.status).toBe(201);
  });
});
```

---

## Debugging Tests

### Running a Single Test

```bash
# Run tests matching a pattern
npm test -- --grep "should return token"

# Run a specific file
npm test -- auth.test.js
```

### Verbose Output

```bash
npm test -- --reporter=verbose
```

### Debugging in VS Code

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend Tests",
      "program": "${workspaceFolder}/backend/node_modules/vitest/vitest.mjs",
      "args": ["run", "--reporter=verbose"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

---

## CI Integration

Tests run automatically on every pull request:

```yaml
# .github/workflows/ci.yml
- name: Run tests
  run: npm test

- name: Enforce coverage thresholds
  run: npm run test:coverage
```

### Coverage Reports

Coverage reports are generated in `lcov` format for CI tools:

- `backend/coverage/lcov.info`
- `frontend/coverage/lcov.info`

---

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Use descriptive test names** - `it('should return 401 when token is expired')`
3. **Keep tests fast** - Use mocks for external services
4. **Avoid test interdependence** - Each test should run in isolation
5. **Test error cases** - Don't just test the happy path
6. **Use factories for test data** - Create helper functions for common data
7. **Clean up after tests** - Reset state between tests
8. **Don't test framework code** - Focus on your business logic

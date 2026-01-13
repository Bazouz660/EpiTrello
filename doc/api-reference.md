# API Reference

This document provides a complete reference for the EpiTrello REST API.

## Base URL

| Environment | Base URL                                |
| ----------- | --------------------------------------- |
| Development | `http://localhost:5000/api`             |
| Production  | `https://epitrello-backend.fly.dev/api` |

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained via the `/auth/login` or `/auth/register` endpoints and are valid for 7 days.

## Response Format

### Success Response

```json
{
  "data": { ... }
}
```

### Error Response

```json
{
  "message": "Error description",
  "details": { ... }  // Optional additional info
}
```

## HTTP Status Codes

| Code | Description                          |
| ---- | ------------------------------------ |
| 200  | Success                              |
| 201  | Created                              |
| 204  | No Content (successful deletion)     |
| 400  | Bad Request (validation error)       |
| 401  | Unauthorized (missing/invalid token) |
| 403  | Forbidden (insufficient permissions) |
| 404  | Not Found                            |
| 409  | Conflict (duplicate resource)        |
| 500  | Internal Server Error                |

---

## Health Check

### GET /health

Check API health status.

**Authentication:** None required

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T12:00:00.000Z",
  "uptime": 3600
}
```

---

## Authentication

### POST /auth/register

Create a new user account.

**Authentication:** None required

**Request Body:**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

| Field      | Type   | Required | Constraints                            |
| ---------- | ------ | -------- | -------------------------------------- |
| `username` | string | Yes      | 3-50 characters                        |
| `email`    | string | Yes      | Valid email format                     |
| `password` | string | Yes      | Min 12 chars, must pass strength check |

**Response (201):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": null,
    "createdAt": "2026-01-13T12:00:00.000Z"
  }
}
```

**Errors:**

- `400` - Missing required fields or weak password
- `409` - User already exists

---

### POST /auth/login

Authenticate user and receive token.

**Authentication:** None required

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": null,
    "createdAt": "2026-01-13T12:00:00.000Z"
  }
}
```

**Errors:**

- `400` - Missing email or password
- `401` - Invalid credentials

---

### GET /auth/me

Get current authenticated user.

**Authentication:** Required

**Response (200):**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": "data:image/png;base64,...",
    "createdAt": "2026-01-13T12:00:00.000Z"
  }
}
```

---

### POST /auth/forgot-password

Request password reset email.

**Authentication:** None required

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

**Response (200):**

```json
{
  "message": "If an account with that email exists, we sent a password reset link."
}
```

> Note: Always returns success to prevent email enumeration attacks.

---

### POST /auth/reset-password

Reset password using token from email.

**Authentication:** None required

**Request Body:**

```json
{
  "token": "abc123...",
  "password": "NewSecurePassword123!"
}
```

**Response (200):**

```json
{
  "message": "Password reset successful"
}
```

**Errors:**

- `400` - Missing fields, weak password, or invalid/expired token

---

## Users

### GET /users/profile

Get current user's profile.

**Authentication:** Required

**Response (200):**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": "data:image/png;base64,...",
    "createdAt": "2026-01-13T12:00:00.000Z"
  }
}
```

---

### PUT /users/profile

Update current user's profile.

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | New username (3-50 chars) |
| `email` | string | Yes | New email |
| `avatar` | file | No | Avatar image (JPEG, PNG, GIF, WebP, max 2MB) |
| `removeAvatar` | string | No | Set to "true" to remove avatar |

**Response (200):**

```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": "data:image/png;base64,...",
    "createdAt": "2026-01-13T12:00:00.000Z"
  }
}
```

**Errors:**

- `400` - Invalid input or unsupported avatar format
- `409` - Username or email already taken

---

### PUT /users/password

Change current user's password.

**Authentication:** Required

**Request Body:**

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response (200):**

```json
{
  "message": "Password updated successfully"
}
```

**Errors:**

- `400` - Missing fields, incorrect current password, or weak new password

---

### GET /users/search

Search for users by username or email.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (min 2 characters) |

**Response (200):**

```json
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "avatarUrl": "data:image/png;base64,..."
    }
  ]
}
```

> Note: Returns max 10 results, excludes current user.

---

## Boards

### POST /boards

Create a new board.

**Authentication:** Required

**Request Body:**

```json
{
  "title": "My Project",
  "description": "Project description",
  "background": {
    "type": "color",
    "value": "#0f172a"
  }
}
```

| Field              | Type   | Required | Description                 |
| ------------------ | ------ | -------- | --------------------------- |
| `title`            | string | Yes      | Board title (max 120 chars) |
| `description`      | string | No       | Board description           |
| `background.type`  | string | No       | "color" or "image"          |
| `background.value` | string | No       | Hex color or image URL      |

**Response (201):**

```json
{
  "board": {
    "id": "507f1f77bcf86cd799439011",
    "title": "My Project",
    "description": "Project description",
    "owner": "507f1f77bcf86cd799439012",
    "members": [],
    "background": {
      "type": "color",
      "value": "#0f172a",
      "thumbnail": ""
    },
    "membershipRole": "owner"
  }
}
```

---

### GET /boards

List all boards for the current user.

**Authentication:** Required

**Response (200):**

```json
{
  "boards": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "My Project",
      "description": "Project description",
      "owner": "507f1f77bcf86cd799439012",
      "members": [],
      "background": {
        "type": "color",
        "value": "#0f172a",
        "thumbnail": ""
      },
      "membershipRole": "owner"
    }
  ]
}
```

---

### GET /boards/:id

Get a specific board.

**Authentication:** Required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Board ID |

**Response (200):**

```json
{
  "board": {
    "id": "507f1f77bcf86cd799439011",
    "title": "My Project",
    "description": "Project description",
    "owner": "507f1f77bcf86cd799439012",
    "members": [
      {
        "user": "507f1f77bcf86cd799439013",
        "role": "member"
      }
    ],
    "background": {
      "type": "color",
      "value": "#0f172a",
      "thumbnail": ""
    },
    "membershipRole": "owner"
  }
}
```

**Errors:**

- `403` - Not a member of the board
- `404` - Board not found

---

### PATCH /boards/:id

Update a board.

**Authentication:** Required (admin or owner)

**Request Body:**

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "background": {
    "type": "image",
    "value": "https://example.com/image.jpg",
    "thumbnail": "https://example.com/thumb.jpg"
  }
}
```

**Response (200):**

```json
{
  "board": { ... }
}
```

**Errors:**

- `403` - Not admin or owner
- `404` - Board not found

---

### DELETE /boards/:id

Delete a board.

**Authentication:** Required (owner only)

**Response (204):** No content

**Errors:**

- `403` - Not the owner
- `404` - Board not found

---

### GET /boards/:id/members

Get board members with details.

**Authentication:** Required

**Response (200):**

```json
{
  "members": [
    {
      "id": "507f1f77bcf86cd799439012",
      "username": "owner",
      "email": "owner@example.com",
      "avatarUrl": null,
      "role": "owner"
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "username": "member",
      "email": "member@example.com",
      "avatarUrl": null,
      "role": "member"
    }
  ]
}
```

---

### POST /boards/:id/members

Add a member to the board.

**Authentication:** Required (admin or owner)

**Request Body:**

```json
{
  "userId": "507f1f77bcf86cd799439013",
  "role": "member"
}
```

| Field    | Type   | Required | Description                                        |
| -------- | ------ | -------- | -------------------------------------------------- |
| `userId` | string | Yes      | User ID to add                                     |
| `role`   | string | No       | "admin", "member", or "viewer" (default: "member") |

**Response (200):**

```json
{
  "message": "Member added successfully",
  "member": {
    "user": "507f1f77bcf86cd799439013",
    "role": "member"
  },
  "board": { ... }
}
```

**Errors:**

- `400` - Missing userId, invalid role, or adding owner
- `403` - Not admin or owner
- `404` - Board not found
- `409` - User already a member

---

### PATCH /boards/:id/members/:userId

Update a member's role.

**Authentication:** Required (admin or owner)

**Request Body:**

```json
{
  "role": "admin"
}
```

**Response (200):**

```json
{
  "message": "Member updated successfully",
  "board": { ... }
}
```

**Errors:**

- `400` - Invalid role or cannot change owner role
- `403` - Not admin or owner, or insufficient permissions
- `404` - Board or member not found

---

### DELETE /boards/:id/members/:userId

Remove a member from the board.

**Authentication:** Required (admin or owner, or self-removal)

**Response (200):**

```json
{
  "message": "Member removed successfully",
  "board": { ... }
}
```

**Errors:**

- `400` - Cannot remove owner
- `403` - Insufficient permissions
- `404` - Board or member not found

---

### GET /boards/:id/activity

Get board activity history.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max entries to return |
| `before` | string | - | Cursor for pagination (activity ID) |

**Response (200):**

```json
{
  "activity": [
    {
      "id": "abc123",
      "actor": "507f1f77bcf86cd799439012",
      "action": "created card",
      "entityType": "card",
      "entityId": "507f1f77bcf86cd799439014",
      "entityTitle": "New Task",
      "details": "in \"To Do\"",
      "createdAt": "2026-01-13T12:00:00.000Z"
    }
  ],
  "hasMore": true,
  "nextCursor": "xyz789"
}
```

---

## Lists

### POST /lists

Create a new list.

**Authentication:** Required (member or higher)

**Request Body:**

```json
{
  "title": "To Do",
  "board": "507f1f77bcf86cd799439011",
  "position": 0
}
```

| Field      | Type   | Required | Description                                  |
| ---------- | ------ | -------- | -------------------------------------------- |
| `title`    | string | Yes      | List title (max 120 chars)                   |
| `board`    | string | Yes      | Parent board ID                              |
| `position` | number | No       | Position in board (auto-assigned if omitted) |

**Response (201):**

```json
{
  "list": {
    "id": "507f1f77bcf86cd799439015",
    "title": "To Do",
    "board": "507f1f77bcf86cd799439011",
    "position": 0,
    "archived": false
  }
}
```

**Errors:**

- `400` - Missing required fields
- `403` - Not a member of the board
- `404` - Board not found
- `409` - Position conflict

---

### GET /lists

Get all lists for a board.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `board` | string | Yes | Board ID |

**Response (200):**

```json
{
  "lists": [
    {
      "id": "507f1f77bcf86cd799439015",
      "title": "To Do",
      "board": "507f1f77bcf86cd799439011",
      "position": 0,
      "archived": false
    }
  ]
}
```

---

### GET /lists/:id

Get a specific list.

**Authentication:** Required

**Response (200):**

```json
{
  "list": {
    "id": "507f1f77bcf86cd799439015",
    "title": "To Do",
    "board": "507f1f77bcf86cd799439011",
    "position": 0,
    "archived": false
  }
}
```

---

### PATCH /lists/:id

Update a list.

**Authentication:** Required (member or higher)

**Request Body:**

```json
{
  "title": "In Progress",
  "position": 1,
  "archived": false
}
```

**Response (200):**

```json
{
  "list": { ... }
}
```

---

### DELETE /lists/:id

Delete a list and all its cards.

**Authentication:** Required (member or higher)

**Response (204):** No content

---

### POST /lists/reorder

Reorder multiple lists at once.

**Authentication:** Required (member or higher)

**Request Body:**

```json
{
  "board": "507f1f77bcf86cd799439011",
  "lists": [
    { "id": "507f1f77bcf86cd799439015", "position": 0 },
    { "id": "507f1f77bcf86cd799439016", "position": 1 }
  ]
}
```

**Response (200):**

```json
{
  "lists": [ ... ]
}
```

---

## Cards

### POST /cards

Create a new card.

**Authentication:** Required (member or higher)

**Request Body:**

```json
{
  "title": "Implement feature X",
  "list": "507f1f77bcf86cd799439015",
  "description": "Detailed description",
  "position": 0
}
```

| Field         | Type   | Required | Description                                 |
| ------------- | ------ | -------- | ------------------------------------------- |
| `title`       | string | Yes      | Card title (max 120 chars)                  |
| `list`        | string | Yes      | Parent list ID                              |
| `description` | string | No       | Card description                            |
| `position`    | number | No       | Position in list (auto-assigned if omitted) |

**Response (201):**

```json
{
  "card": {
    "id": "507f1f77bcf86cd799439017",
    "title": "Implement feature X",
    "description": "Detailed description",
    "list": "507f1f77bcf86cd799439015",
    "position": 0,
    "labels": [],
    "dueDate": null,
    "checklist": [],
    "assignedMembers": [],
    "comments": [],
    "activity": [
      {
        "id": "abc123",
        "message": "Card created",
        "actor": "507f1f77bcf86cd799439012",
        "createdAt": "2026-01-13T12:00:00.000Z"
      }
    ],
    "archived": false
  }
}
```

---

### GET /cards

Get all cards for a list.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `list` | string | Yes | List ID |

**Response (200):**

```json
{
  "cards": [ ... ]
}
```

---

### GET /cards/:id

Get a specific card.

**Authentication:** Required

**Response (200):**

```json
{
  "card": { ... }
}
```

---

### PATCH /cards/:id

Update a card.

**Authentication:** Required (member or higher)

**Request Body:**

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "labels": [{ "color": "#ef4444", "text": "Bug" }],
  "dueDate": "2026-02-01T00:00:00.000Z",
  "checklist": [
    { "text": "Subtask 1", "completed": true },
    { "text": "Subtask 2", "completed": false }
  ],
  "assignedMembers": ["507f1f77bcf86cd799439012"],
  "archived": false
}
```

**Response (200):**

```json
{
  "card": { ... }
}
```

---

### DELETE /cards/:id

Delete a card.

**Authentication:** Required (member or higher)

**Response (204):** No content

---

### POST /cards/:id/move

Move a card to a different list or position.

**Authentication:** Required (member or higher)

**Request Body:**

```json
{
  "list": "507f1f77bcf86cd799439016",
  "position": 2
}
```

| Field      | Type   | Required | Description                                  |
| ---------- | ------ | -------- | -------------------------------------------- |
| `list`     | string | No       | Target list ID (if moving to different list) |
| `position` | number | Yes      | New position in target list                  |

**Response (200):**

```json
{
  "card": { ... }
}
```

---

### POST /cards/:id/comments

Add a comment to a card.

**Authentication:** Required (member or higher)

**Request Body:**

```json
{
  "text": "This is a comment with @johndoe mention"
}
```

**Response (201):**

```json
{
  "card": { ... },
  "comment": {
    "id": "abc123",
    "author": "507f1f77bcf86cd799439012",
    "text": "This is a comment with @johndoe mention",
    "createdAt": "2026-01-13T12:00:00.000Z"
  }
}
```

> Note: @mentions in comments trigger notifications to mentioned users.

---

## Notifications

### GET /notifications

Get user's notifications.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Max notifications to return |
| `offset` | number | 0 | Pagination offset |

**Response (200):**

```json
{
  "notifications": [
    {
      "id": "507f1f77bcf86cd799439018",
      "type": "card_assigned",
      "title": "You were assigned to a card",
      "message": "johndoe assigned you to \"Implement feature X\"",
      "board": "507f1f77bcf86cd799439011",
      "card": "507f1f77bcf86cd799439017",
      "actor": "507f1f77bcf86cd799439012",
      "read": false,
      "createdAt": "2026-01-13T12:00:00.000Z"
    }
  ],
  "total": 5
}
```

---

### GET /notifications/unread-count

Get count of unread notifications.

**Authentication:** Required

**Response (200):**

```json
{
  "count": 3
}
```

---

### PATCH /notifications/:id/read

Mark a notification as read.

**Authentication:** Required

**Response (200):**

```json
{
  "notification": { ... }
}
```

---

### POST /notifications/mark-all-read

Mark all notifications as read.

**Authentication:** Required

**Response (200):**

```json
{
  "message": "All notifications marked as read"
}
```

---

### DELETE /notifications/:id

Delete a notification.

**Authentication:** Required

**Response (204):** No content

---

## Error Handling

### Validation Errors (400)

```json
{
  "message": "Validation error",
  "details": {
    "field": "email",
    "error": "Invalid email format"
  }
}
```

### Authentication Errors (401)

```json
{
  "message": "Unauthorized"
}
```

### Permission Errors (403)

```json
{
  "message": "Forbidden"
}
```

### Not Found Errors (404)

```json
{
  "message": "Resource not found"
}
```

### Conflict Errors (409)

```json
{
  "message": "Resource already exists"
}
```

---

## Rate Limiting

Rate limiting is planned for future implementation. Current recommendations:

- Limit requests to 100/minute per user
- Implement exponential backoff on errors

## Versioning

The API is currently unversioned. Breaking changes will be announced in release notes.

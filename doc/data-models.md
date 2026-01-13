# Data Model Design

This document describes the MongoDB schema design for EpiTrello, balancing collaboration features with performance and scalability.

## Overview

EpiTrello uses MongoDB as its primary data store, with Mongoose as the ODM (Object Document Mapper). The schema design follows these principles:

- **Denormalization for read performance** - Embed related data where appropriate
- **Indexed queries** - Compound indexes for common query patterns
- **Text search support** - Full-text indexes for search functionality
- **Soft deletes** - Archive flags instead of hard deletes

## Entity Relationship Diagram

```
┌──────────────┐
│     User     │
│──────────────│
│ _id          │
│ username     │
│ email        │
│ password     │
│ avatarUrl    │
└──────┬───────┘
       │
       │ owns / member of
       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    Board     │──────▶│     List     │──────▶│     Card     │
│──────────────│ 1:N   │──────────────│ 1:N   │──────────────│
│ _id          │       │ _id          │       │ _id          │
│ title        │       │ title        │       │ title        │
│ description  │       │ board (ref)  │       │ description  │
│ owner (ref)  │       │ position     │       │ list (ref)   │
│ members[]    │       │ archived     │       │ position     │
│ background   │       └──────────────┘       │ labels[]     │
│ activity[]   │                              │ dueDate      │
└──────────────┘                              │ checklist[]  │
       │                                      │ assignedMembers[]
       │ notifies                             │ comments[]   │
       ▼                                      │ activity[]   │
┌──────────────┐                              │ archived     │
│ Notification │                              └──────────────┘
│──────────────│
│ recipient    │
│ type         │
│ title        │
│ message      │
│ board (ref)  │
│ card (ref)   │
│ actor (ref)  │
│ read         │
└──────────────┘
```

## Models

### User

Stores user account information and authentication credentials.

```javascript
{
  _id: ObjectId,
  username: String,      // Unique, 3-50 chars
  email: String,         // Unique, lowercase, valid email format
  password: String,      // Bcrypt hash, min 12 chars (pre-hash)
  avatarUrl: String,     // Optional, data URL for profile photo
  passwordResetToken: String,    // Hashed reset token
  passwordResetExpires: Date,    // Token expiration
  createdAt: Date,       // Auto-managed
  updatedAt: Date        // Auto-managed
}
```

| Field                  | Type     | Constraints                               | Description                 |
| ---------------------- | -------- | ----------------------------------------- | --------------------------- |
| `_id`                  | ObjectId | Primary key                               | Auto-generated identifier   |
| `username`             | String   | Required, unique, 3-50 chars, trimmed     | Display name                |
| `email`                | String   | Required, unique, lowercase, email format | Login identifier            |
| `password`             | String   | Required, min 12 chars                    | Bcrypt hashed password      |
| `avatarUrl`            | String   | Optional                                  | Base64 data URL for avatar  |
| `passwordResetToken`   | String   | Optional                                  | SHA-256 hashed reset token  |
| `passwordResetExpires` | Date     | Optional                                  | Reset token expiration time |

**Indexes:**

- `email` - Unique index for login lookups
- `username` - Unique index for username validation

---

### Board

Represents a Kanban board containing lists and cards.

```javascript
{
  _id: ObjectId,
  title: String,         // Required, max 120 chars
  description: String,   // Optional
  owner: ObjectId,       // References User
  members: [{
    user: ObjectId,      // References User
    role: String         // 'owner' | 'admin' | 'member' | 'viewer'
  }],
  background: {
    type: String,        // 'color' | 'image'
    value: String,       // Hex color or image URL
    thumbnail: String    // Optional thumbnail for images
  },
  activity: [{
    id: String,
    actor: ObjectId,     // References User
    action: String,
    entityType: String,  // 'board' | 'list' | 'card' | 'member'
    entityId: String,
    entityTitle: String,
    details: String,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

| Field              | Type     | Constraints                     | Description               |
| ------------------ | -------- | ------------------------------- | ------------------------- |
| `_id`              | ObjectId | Primary key                     | Auto-generated identifier |
| `title`            | String   | Required, max 120 chars         | Board name                |
| `description`      | String   | Optional                        | Board description         |
| `owner`            | ObjectId | Required, ref: User             | Board creator             |
| `members`          | Array    | Default: []                     | Board membership list     |
| `members.user`     | ObjectId | Required, ref: User             | Member user reference     |
| `members.role`     | String   | Enum: owner/admin/member/viewer | Access level              |
| `background`       | Object   | Required                        | Visual customization      |
| `background.type`  | String   | Enum: color/image               | Background type           |
| `background.value` | String   | Required, default: #0f172a      | Color hex or image URL    |
| `activity`         | Array    | Default: []                     | Activity log entries      |

**Indexes:**

- `owner` - For querying owned boards
- `members.user` - For querying membership
- Text index on `title`, `description` - Full-text search

**Member Roles:**
| Role | Description |
|------|-------------|
| `owner` | Full control, can delete board |
| `admin` | Can manage members and settings |
| `member` | Can create/edit/delete cards and lists |
| `viewer` | Read-only access |

---

### List

Represents a column within a board containing cards.

```javascript
{
  _id: ObjectId,
  title: String,         // Required, max 120 chars
  board: ObjectId,       // References Board
  position: Number,      // Ordering within board
  archived: Boolean,     // Default: false
  createdAt: Date,
  updatedAt: Date
}
```

| Field      | Type     | Constraints                   | Description                  |
| ---------- | -------- | ----------------------------- | ---------------------------- |
| `_id`      | ObjectId | Primary key                   | Auto-generated identifier    |
| `title`    | String   | Required, max 120 chars       | List name                    |
| `board`    | ObjectId | Required, ref: Board, indexed | Parent board                 |
| `position` | Number   | Required                      | Order within board (0-based) |
| `archived` | Boolean  | Default: false                | Soft delete flag             |

**Indexes:**

- `board` - For querying lists by board
- Compound `{ board, position }` - Unique, for ordered retrieval

---

### Card

Represents a task or item within a list.

```javascript
{
  _id: ObjectId,
  title: String,            // Required, max 120 chars
  description: String,      // Optional
  list: ObjectId,           // References List
  position: Number,         // Ordering within list
  labels: [{
    color: String,          // Required, hex color
    text: String            // Optional label text
  }],
  dueDate: Date,            // Optional deadline
  checklist: [{
    text: String,           // Required
    completed: Boolean      // Default: false
  }],
  assignedMembers: [ObjectId],  // References User[]
  comments: [{
    id: String,
    author: ObjectId,       // References User
    text: String,           // Required
    createdAt: Date
  }],
  activity: [{
    id: String,
    actor: ObjectId,        // References User
    message: String,        // Required
    createdAt: Date
  }],
  archived: Boolean,        // Default: false
  createdAt: Date,
  updatedAt: Date
}
```

| Field                 | Type     | Constraints                  | Description               |
| --------------------- | -------- | ---------------------------- | ------------------------- |
| `_id`                 | ObjectId | Primary key                  | Auto-generated identifier |
| `title`               | String   | Required, max 120 chars      | Card title                |
| `description`         | String   | Optional, default: ''        | Card description          |
| `list`                | ObjectId | Required, ref: List, indexed | Parent list               |
| `position`            | Number   | Required, min: 0             | Order within list         |
| `labels`              | Array    | Default: []                  | Color-coded labels        |
| `labels.color`        | String   | Required                     | Hex color code            |
| `labels.text`         | String   | Optional                     | Label text                |
| `dueDate`             | Date     | Optional                     | Task deadline             |
| `checklist`           | Array    | Default: []                  | Sub-task checklist        |
| `checklist.text`      | String   | Required                     | Checklist item text       |
| `checklist.completed` | Boolean  | Default: false               | Completion status         |
| `assignedMembers`     | Array    | Default: [], ref: User       | Assigned users            |
| `comments`            | Array    | Default: []                  | Card comments             |
| `comments.author`     | ObjectId | Optional, ref: User          | Comment author            |
| `comments.text`       | String   | Required                     | Comment text              |
| `activity`            | Array    | Default: []                  | Card activity log         |
| `archived`            | Boolean  | Default: false               | Soft delete flag          |

**Indexes:**

- `list` - For querying cards by list
- Compound `{ list, position }` - Unique, for ordered retrieval
- Text index on `title`, `description` - Full-text search

---

### Notification

Stores user notifications for various events.

```javascript
{
  _id: ObjectId,
  recipient: ObjectId,   // References User
  type: String,          // 'card_assigned' | 'mention' | 'comment'
  title: String,         // Required, max 200 chars
  message: String,       // Required, max 500 chars
  board: ObjectId,       // Optional, References Board
  card: ObjectId,        // Optional, References Card
  actor: ObjectId,       // Optional, References User (who triggered)
  read: Boolean,         // Default: false
  createdAt: Date,
  updatedAt: Date
}
```

| Field       | Type     | Constraints                  | Description               |
| ----------- | -------- | ---------------------------- | ------------------------- |
| `_id`       | ObjectId | Primary key                  | Auto-generated identifier |
| `recipient` | ObjectId | Required, ref: User, indexed | Notification target       |
| `type`      | String   | Required, enum               | Notification category     |
| `title`     | String   | Required, max 200 chars      | Notification title        |
| `message`   | String   | Required, max 500 chars      | Notification body         |
| `board`     | ObjectId | Optional, ref: Board         | Related board             |
| `card`      | ObjectId | Optional, ref: Card          | Related card              |
| `actor`     | ObjectId | Optional, ref: User          | Triggering user           |
| `read`      | Boolean  | Default: false, indexed      | Read status               |

**Notification Types:**
| Type | Trigger |
|------|---------|
| `card_assigned` | User assigned to a card |
| `mention` | User @mentioned in a comment |
| `comment` | Comment added to assigned card |

**Indexes:**

- `recipient` - For querying user notifications
- `read` - For filtering unread notifications
- Compound `{ recipient, read, createdAt }` - Optimized notification queries

## Relationships

```
User (1) ──owns──▶ (N) Board
User (N) ◀──members──▶ (N) Board
Board (1) ──contains──▶ (N) List
List (1) ──contains──▶ (N) Card
User (N) ◀──assignedMembers──▶ (N) Card
User (1) ──receives──▶ (N) Notification
```

### Relationship Details

1. **User → Board (Owner)**
   - One user can own many boards
   - A board has exactly one owner
   - Owner reference stored in `board.owner`

2. **User ↔ Board (Members)**
   - Many-to-many through `board.members` array
   - Embedded documents for role information
   - Includes owner for unified access queries

3. **Board → List**
   - One board contains many lists
   - Lists reference parent via `list.board`
   - Ordered by `position` field

4. **List → Card**
   - One list contains many cards
   - Cards reference parent via `card.list`
   - Ordered by `position` field

5. **User ↔ Card (Assignment)**
   - Many-to-many through `card.assignedMembers` array
   - Simple ObjectId references

6. **User → Notification**
   - One user receives many notifications
   - Notifications reference recipient via `notification.recipient`

## Query Patterns

### Common Queries

```javascript
// Get all boards for a user (owner or member)
Board.find({
  $or: [{ owner: userId }, { 'members.user': userId }],
});

// Get all lists for a board, ordered
List.find({ board: boardId, archived: false }).sort({ position: 1 });

// Get all cards for a list, ordered
Card.find({ list: listId, archived: false }).sort({ position: 1 });

// Get unread notifications for a user
Notification.find({ recipient: userId, read: false }).sort({ createdAt: -1 });

// Search cards by text
Card.find({ $text: { $search: searchTerm } });
```

### Index Usage

| Query                           | Index Used                       |
| ------------------------------- | -------------------------------- |
| Find boards by owner            | `owner`                          |
| Find boards by member           | `members.user`                   |
| Find lists by board             | `{ board, position }`            |
| Find cards by list              | `{ list, position }`             |
| Find notifications by recipient | `{ recipient, read, createdAt }` |
| Text search on boards           | Text index                       |
| Text search on cards            | Text index                       |

## Data Integrity

### Cascade Operations

Currently handled at the application level:

1. **Delete Board** → Delete all Lists → Delete all Cards
2. **Delete List** → Delete all Cards in list
3. **Remove User from Board** → Remove from `assignedMembers` in cards

### Validation

Mongoose schema validation ensures:

- Required fields are present
- String lengths are within limits
- Enum values are valid
- References are valid ObjectIds
- Unique constraints are maintained

## Future Considerations

### Scalability

- **Activity Logs**: Consider capped collections or TTL indexes
- **Notifications**: Archive old notifications or implement pagination
- **Attachments**: External storage (S3) with references in cards

### Performance

- **Denormalization**: Cache user display names in embedded documents
- **Aggregation**: Pre-computed card counts per list
- **Sharding**: Shard by `boardId` if volume grows significantly

### Compliance

- **Soft Deletes**: Implement for all entities with `deletedAt` timestamp
- **Audit Trail**: Immutable activity logs with retention policies
- **Data Export**: GDPR-compliant user data export functionality

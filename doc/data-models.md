# Data Model Design

The MongoDB schema design balances collaboration features with performance and future scalability.

## User

| Field       | Type     | Notes                               |
| ----------- | -------- | ----------------------------------- |
| `_id`       | ObjectId | Primary key                         |
| `username`  | String   | Unique, indexed, trimmed            |
| `email`     | String   | Unique, indexed, lowercase          |
| `password`  | String   | Bcrypt hash with min length 12      |
| `avatarUrl` | String   | Optional data URL for profile photo |
| `createdAt` | Date     | Auto-managed by Mongoose            |
| `updatedAt` | Date     | Auto-managed by Mongoose            |

**Indexes**: `email`, `username`.

## Board

| Field         | Type     | Notes                               |
| ------------- | -------- | ----------------------------------- |
| `_id`         | ObjectId | Primary key                         |
| `title`       | String   | Required, indexed for text search   |
| `description` | String   | Optional, text index                |
| `owner`       | ObjectId | References `User`                   |
| `members`     | Array    | Embedded documents `{ user, role }` |
| `createdAt`   | Date     | Auto-generated                      |
| `updatedAt`   | Date     | Auto-generated                      |

**Indexes**: `owner`, `members.user`, text index on `title` & `description`.

## List

| Field       | Type     | Notes                       |
| ----------- | -------- | --------------------------- |
| `_id`       | ObjectId | Primary key                 |
| `title`     | String   | Required                    |
| `board`     | ObjectId | References `Board`, indexed |
| `position`  | Number   | Ordering within board       |
| `archived`  | Boolean  | Default `false`             |
| `createdAt` | Date     | Auto-generated              |
| `updatedAt` | Date     | Auto-generated              |

**Indexes**: Compound `{ board, position }` for deterministic ordering.

## Card

| Field             | Type     | Notes                          |
| ----------------- | -------- | ------------------------------ |
| `_id`             | ObjectId | Primary key                    |
| `title`           | String   | Required, text indexed         |
| `description`     | String   | Optional                       |
| `list`            | ObjectId | References `List`, indexed     |
| `position`        | Number   | Ordering within list           |
| `labels`          | Array    | Embedded `{ color, text }`     |
| `dueDate`         | Date     | Optional                       |
| `checklist`       | Array    | Embedded `{ text, completed }` |
| `assignedMembers` | Array    | References `User` IDs          |
| `archived`        | Boolean  | Default `false`                |
| `createdAt`       | Date     | Auto-generated                 |
| `updatedAt`       | Date     | Auto-generated                 |

**Indexes**: Compound `{ list, position }`, text index on `title` & `description`.

## Relationships

- A `User` can own many `Board` documents and participate in many boards via the `members` array.
- A `Board` contains ordered `List` documents.
- A `List` contains ordered `Card` documents.
- Cards embed checklist items and labels for efficient retrieval within a board view.

## Future Considerations

- Add activity logs with capped collections for auditing.
- Introduce archived collections or soft-delete timestamps for compliance retention.
- Consider sharding strategies if board volume grows significantly.

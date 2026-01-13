# WebSocket Events

This document describes the real-time WebSocket events used in EpiTrello for live collaboration.

## Overview

EpiTrello uses Socket.IO for real-time bidirectional communication. This enables:

- Live board updates across all connected users
- Real-time notifications
- Cursor position tracking for collaboration
- Active user presence indicators

## Connection

### Server URL

| Environment | URL                               |
| ----------- | --------------------------------- |
| Development | `ws://localhost:5000`             |
| Production  | `wss://epitrello-backend.fly.dev` |

### Authentication

Socket connections require JWT authentication:

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:5000', {
  auth: {
    token: 'your-jwt-token',
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
});
```

### Connection Events

| Event           | Direction       | Description            |
| --------------- | --------------- | ---------------------- |
| `connect`       | Server → Client | Connection established |
| `connect_error` | Server → Client | Connection failed      |
| `disconnect`    | Server → Client | Connection lost        |
| `error`         | Server → Client | Generic error message  |

```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});

socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});
```

---

## Room System

EpiTrello uses two types of rooms:

1. **User Rooms** (`user:{userId}`) - Personal notifications
2. **Board Rooms** (`board:{boardId}`) - Board-specific updates

Users automatically join their personal room on connection. Board rooms require explicit joining.

---

## Board Events

### Client → Server

#### board:join

Join a board room to receive real-time updates.

```javascript
socket.emit('board:join', boardId);
```

**Response Events:**

- `board:joined` - Successfully joined
- `error` - Failed to join (not found, access denied)

#### board:leave

Leave a board room.

```javascript
socket.emit('board:leave', boardId);
```

### Server → Client

#### board:joined

Confirms successful board room join with active users.

```javascript
socket.on('board:joined', (data) => {
  console.log('Joined board:', data.boardId);
  console.log('Active users:', data.activeUsers);
});
```

**Payload:**

```json
{
  "boardId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "username": "johndoe",
  "activeUsers": [
    {
      "userId": "507f1f77bcf86cd799439012",
      "username": "johndoe",
      "avatarUrl": "data:image/png;base64,...",
      "joinedAt": "2026-01-13T12:00:00.000Z"
    }
  ]
}
```

#### board:user-joined

A user joined the board room.

```javascript
socket.on('board:user-joined', (data) => {
  console.log(`${data.username} joined the board`);
});
```

**Payload:**

```json
{
  "userId": "507f1f77bcf86cd799439012",
  "username": "johndoe",
  "avatarUrl": "data:image/png;base64,..."
}
```

#### board:user-left

A user left the board room.

```javascript
socket.on('board:user-left', (data) => {
  console.log(`${data.username} left the board`);
});
```

**Payload:**

```json
{
  "userId": "507f1f77bcf86cd799439012",
  "username": "johndoe"
}
```

#### board:updated

Board settings were updated.

```javascript
socket.on('board:updated', (data) => {
  console.log('Board updated:', data.board);
});
```

**Payload:**

```json
{
  "board": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Updated Title",
    "description": "Updated description",
    "background": { "type": "color", "value": "#0f172a" }
  },
  "userId": "507f1f77bcf86cd799439012"
}
```

#### board:deleted

Board was deleted.

```javascript
socket.on('board:deleted', (data) => {
  console.log('Board deleted:', data.boardId);
  // Navigate away from board
});
```

**Payload:**

```json
{
  "boardId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012"
}
```

---

## List Events

All list events are broadcast to the board room.

### Server → Client

#### list:created

A new list was created.

```javascript
socket.on('list:created', (data) => {
  // Add list to local state
});
```

**Payload:**

```json
{
  "list": {
    "id": "507f1f77bcf86cd799439015",
    "title": "New List",
    "board": "507f1f77bcf86cd799439011",
    "position": 2,
    "archived": false
  },
  "userId": "507f1f77bcf86cd799439012"
}
```

#### list:updated

A list was updated.

```javascript
socket.on('list:updated', (data) => {
  // Update list in local state
});
```

**Payload:**

```json
{
  "list": {
    "id": "507f1f77bcf86cd799439015",
    "title": "Updated Title",
    "position": 1
  },
  "userId": "507f1f77bcf86cd799439012"
}
```

#### list:deleted

A list was deleted.

```javascript
socket.on('list:deleted', (data) => {
  // Remove list from local state
});
```

**Payload:**

```json
{
  "listId": "507f1f77bcf86cd799439015",
  "userId": "507f1f77bcf86cd799439012"
}
```

#### list:reordered

Lists were reordered.

```javascript
socket.on('list:reordered', (data) => {
  // Update list positions in local state
});
```

**Payload:**

```json
{
  "lists": [
    { "id": "507f1f77bcf86cd799439015", "position": 0 },
    { "id": "507f1f77bcf86cd799439016", "position": 1 }
  ],
  "userId": "507f1f77bcf86cd799439012"
}
```

---

## Card Events

All card events are broadcast to the board room.

### Server → Client

#### card:created

A new card was created.

```javascript
socket.on('card:created', (data) => {
  // Add card to appropriate list
});
```

**Payload:**

```json
{
  "card": {
    "id": "507f1f77bcf86cd799439017",
    "title": "New Card",
    "description": "",
    "list": "507f1f77bcf86cd799439015",
    "position": 0,
    "labels": [],
    "dueDate": null,
    "checklist": [],
    "assignedMembers": [],
    "archived": false
  },
  "listId": "507f1f77bcf86cd799439015",
  "userId": "507f1f77bcf86cd799439012"
}
```

#### card:updated

A card was updated.

```javascript
socket.on('card:updated', (data) => {
  // Update card in local state
});
```

**Payload:**

```json
{
  "card": {
    "id": "507f1f77bcf86cd799439017",
    "title": "Updated Card",
    "description": "New description"
  },
  "userId": "507f1f77bcf86cd799439012"
}
```

#### card:deleted

A card was deleted.

```javascript
socket.on('card:deleted', (data) => {
  // Remove card from local state
});
```

**Payload:**

```json
{
  "cardId": "507f1f77bcf86cd799439017",
  "listId": "507f1f77bcf86cd799439015",
  "userId": "507f1f77bcf86cd799439012"
}
```

#### card:moved

A card was moved to a different list or position.

```javascript
socket.on('card:moved', (data) => {
  // Update card position in local state
});
```

**Payload:**

```json
{
  "card": {
    "id": "507f1f77bcf86cd799439017",
    "list": "507f1f77bcf86cd799439016",
    "position": 2
  },
  "sourceListId": "507f1f77bcf86cd799439015",
  "targetListId": "507f1f77bcf86cd799439016",
  "userId": "507f1f77bcf86cd799439012"
}
```

#### card:comment-added

A comment was added to a card.

```javascript
socket.on('card:comment-added', (data) => {
  // Add comment to card in local state
});
```

**Payload:**

```json
{
  "cardId": "507f1f77bcf86cd799439017",
  "comment": {
    "id": "abc123",
    "author": "507f1f77bcf86cd799439012",
    "text": "This is a comment",
    "createdAt": "2026-01-13T12:00:00.000Z"
  },
  "userId": "507f1f77bcf86cd799439012"
}
```

---

## Member Events

### Server → Client

#### member:added

A member was added to the board.

```javascript
socket.on('member:added', (data) => {
  // Add member to board state
});
```

**Payload:**

```json
{
  "boardId": "507f1f77bcf86cd799439011",
  "member": {
    "id": "507f1f77bcf86cd799439013",
    "username": "newmember",
    "email": "new@example.com",
    "avatarUrl": null,
    "role": "member"
  },
  "userId": "507f1f77bcf86cd799439012"
}
```

#### member:updated

A member's role was changed.

```javascript
socket.on('member:updated', (data) => {
  // Update member role in local state
});
```

**Payload:**

```json
{
  "boardId": "507f1f77bcf86cd799439011",
  "memberId": "507f1f77bcf86cd799439013",
  "role": "admin",
  "userId": "507f1f77bcf86cd799439012"
}
```

#### member:removed

A member was removed from the board.

```javascript
socket.on('member:removed', (data) => {
  // Remove member from board state
  // If current user, redirect away from board
});
```

**Payload:**

```json
{
  "boardId": "507f1f77bcf86cd799439011",
  "memberId": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439012"
}
```

---

## Cursor Events

Real-time cursor tracking for collaboration.

### Client → Server

#### cursor:move

Send cursor position to other users.

```javascript
socket.emit('cursor:move', {
  boardId: '507f1f77bcf86cd799439011',
  x: 450,
  y: 320,
});
```

### Server → Client

#### cursor:updated

Receive cursor position from another user.

```javascript
socket.on('cursor:updated', (data) => {
  // Update cursor indicator for user
});
```

**Payload:**

```json
{
  "userId": "507f1f77bcf86cd799439013",
  "username": "collaborator",
  "avatarUrl": "data:image/png;base64,...",
  "x": 450,
  "y": 320
}
```

---

## Notification Events

Personal notifications are sent to user rooms.

### Server → Client

#### notification:new

A new notification was received.

```javascript
socket.on('notification:new', (data) => {
  // Show notification toast
  // Update notification count
});
```

**Payload:**

```json
{
  "notification": {
    "id": "507f1f77bcf86cd799439018",
    "type": "card_assigned",
    "title": "You were assigned to a card",
    "message": "johndoe assigned you to \"Task XYZ\"",
    "board": "507f1f77bcf86cd799439011",
    "card": "507f1f77bcf86cd799439017",
    "actor": "507f1f77bcf86cd799439012",
    "read": false,
    "createdAt": "2026-01-13T12:00:00.000Z"
  }
}
```

**Notification Types:**
| Type | Description |
|------|-------------|
| `card_assigned` | User was assigned to a card |
| `mention` | User was @mentioned in a comment |
| `comment` | Comment added to user's assigned card |

---

## Error Handling

All errors are sent via the `error` event:

```javascript
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});
```

**Common Errors:**
| Message | Cause |
|---------|-------|
| `Authentication required` | No token provided |
| `Invalid or expired token` | Token verification failed |
| `Board not found` | Invalid board ID |
| `Access denied to board` | User not a member |
| `Board ID required` | Missing board ID parameter |

---

## Client Implementation Example

```javascript
import { io } from 'socket.io-client';
import { store } from './store';
import { addCard, updateCard, removeCard, addList, updateList, removeList } from './slices';

class SocketService {
  constructor() {
    this.socket = null;
    this.currentBoardId = null;
  }

  connect(token) {
    this.socket = io(process.env.SOCKET_URL, {
      auth: { token },
      reconnection: true,
    });

    this.setupEventHandlers();
    return this.socket;
  }

  setupEventHandlers() {
    // Board events
    this.socket.on('board:updated', (data) => {
      store.dispatch(updateBoard(data.board));
    });

    // List events
    this.socket.on('list:created', (data) => {
      store.dispatch(addList(data.list));
    });

    this.socket.on('list:updated', (data) => {
      store.dispatch(updateList(data.list));
    });

    this.socket.on('list:deleted', (data) => {
      store.dispatch(removeList(data.listId));
    });

    // Card events
    this.socket.on('card:created', (data) => {
      store.dispatch(addCard(data.card));
    });

    this.socket.on('card:updated', (data) => {
      store.dispatch(updateCard(data.card));
    });

    this.socket.on('card:deleted', (data) => {
      store.dispatch(removeCard(data.cardId));
    });

    this.socket.on('card:moved', (data) => {
      store.dispatch(moveCard(data));
    });

    // Notification events
    this.socket.on('notification:new', (data) => {
      store.dispatch(addNotification(data.notification));
      showToast(data.notification.title);
    });
  }

  joinBoard(boardId) {
    if (this.currentBoardId) {
      this.socket.emit('board:leave', this.currentBoardId);
    }
    this.currentBoardId = boardId;
    this.socket.emit('board:join', boardId);
  }

  leaveBoard() {
    if (this.currentBoardId) {
      this.socket.emit('board:leave', this.currentBoardId);
      this.currentBoardId = null;
    }
  }

  sendCursorPosition(x, y) {
    if (this.currentBoardId) {
      this.socket.emit('cursor:move', {
        boardId: this.currentBoardId,
        x,
        y,
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentBoardId = null;
    }
  }
}

export const socketService = new SocketService();
```

---

## Best Practices

1. **Join boards explicitly** - Only join the board room when viewing a board
2. **Leave boards on navigation** - Leave the room when navigating away
3. **Handle reconnection** - Re-join rooms after reconnection
4. **Optimistic updates** - Update UI immediately, reconcile on server response
5. **Throttle cursor events** - Send cursor updates at most every 50ms
6. **Handle errors gracefully** - Show user-friendly error messages

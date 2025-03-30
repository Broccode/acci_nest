# ACCI Nest - API Interface Definition

## REST API Specification (OpenAPI/Swagger)

The API interfaces are documented via OpenAPI/Swagger and follow RESTful principles.

```typescript
// user.controller.ts
@ApiTags('users')
@Controller('users')
export class UserController {
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'The user has been created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'Return the user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
```

### API Design Principles

1. **Resource-oriented**: APIs represent resources rather than operations
2. **Standardized HTTP Methods**: Use of GET, POST, PUT, DELETE according to their semantic meaning
3. **Consistent Status Codes**: HTTP status codes are used consistently
4. **Versioning**: APIs are versioned via URL path or header
5. **Consistent Error Formats**: Uniform JSON error format
6. **Pagination**: Standardized parameters for pagination (page, limit)
7. **Filtering**: Consistent query parameters for filtering
8. **HATEOAS**: Links to related resources in the response

### Main Endpoints

#### Auth API

| Endpoint | Method | Description | Request | Response |
|----------|---------|--------------|------------|---------|
| `/auth/login` | POST | User login | `{ email, password }` | `{ token, refreshToken, user }` |
| `/auth/refresh` | POST | Refresh token | `{ refreshToken }` | `{ token, refreshToken }` |
| `/auth/logout` | POST | Logout | `{ token }` | `204 No Content` |
| `/auth/me` | GET | Current user | - | `{ user }` |

#### Users API

| Endpoint | Method | Description | Request | Response |
|----------|---------|--------------|------------|---------|
| `/users` | GET | List users | Query parameters | `[{ user }]` |
| `/users/:id` | GET | Get user | - | `{ user }` |
| `/users` | POST | Create user | `{ user }` | `{ user }` |
| `/users/:id` | PUT | Update user | `{ user }` | `{ user }` |
| `/users/:id` | DELETE | Delete user | - | `204 No Content` |

#### Tenants API

| Endpoint | Method | Description | Request | Response |
|----------|---------|--------------|------------|---------|
| `/tenants` | GET | List tenants | Query parameters | `[{ tenant }]` |
| `/tenants/:id` | GET | Get tenant | - | `{ tenant }` |
| `/tenants` | POST | Create tenant | `{ tenant }` | `{ tenant }` |
| `/tenants/:id` | PUT | Update tenant | `{ tenant }` | `{ tenant }` |
| `/tenants/:id` | DELETE | Delete tenant | - | `204 No Content` |
| `/tenants/:id/users` | GET | Tenant users | - | `[{ user }]` |

#### Plugins API

| Endpoint | Method | Description | Request | Response |
|----------|---------|--------------|------------|---------|
| `/plugins` | GET | List plugins | Query parameters | `[{ plugin }]` |
| `/plugins/:id` | GET | Get plugin | - | `{ plugin }` |
| `/plugins` | POST | Install plugin | `{ plugin }` | `{ plugin }` |
| `/plugins/:id/config` | PUT | Configure plugin | `{ config }` | `{ plugin }` |
| `/plugins/:id/enable` | PATCH | Enable plugin | - | `{ plugin }` |
| `/plugins/:id/disable` | PATCH | Disable plugin | - | `{ plugin }` |

### Example of API Request and Response

**Request:**

```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json
Accept: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2023-04-01T14:22:01Z",
    "updatedAt": "2023-04-01T14:22:01Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Event-based Communication

The application uses WebSockets for real-time communication and internal event-based architecture.

```typescript
// event.gateway.ts
@WebSocketGateway()
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('events')
  handleEvent(@MessageBody() data: any): Observable<WsResponse<any>> {
    const event = 'events';
    return from([1, 2, 3]).pipe(
      map(item => ({ event, data: item })),
    );
  }
}
```

### WebSocket Events

| Event | Direction | Description | Payload |
|-------|----------|--------------|---------|
| `user.connected` | Server → Client | User connected | `{ userId, status }` |
| `user.disconnected` | Server → Client | User disconnected | `{ userId, status }` |
| `notification.new` | Server → Client | New notification | `{ notification }` |
| `data.updated` | Server → Client | Data updated | `{ resource, id, changes }` |
| `chat.message` | Bidirectional | Chat message | `{ message, sender, timestamp }` |

### Event Handler Example

```typescript
// notification.gateway.ts
@WebSocketGateway()
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  // Method to send a notification to a specific user
  sendNotificationToUser(userId: string, notification: Notification) {
    this.server.to(`user_${userId}`).emit('notification.new', notification);
  }

  // Method to send a notification to all users of a tenant
  sendNotificationToTenant(tenantId: string, notification: Notification) {
    this.server.to(`tenant_${tenantId}`).emit('notification.new', notification);
  }

  // Method to send a global notification
  sendGlobalNotification(notification: Notification) {
    this.server.emit('notification.new', notification);
  }
}
```

## External Interfaces

The application integrates with external services via HTTP-based APIs.

```typescript
// external-service.module.ts
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('EXTERNAL_API_URL'),
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${configService.get('EXTERNAL_API_KEY')}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ExternalServiceProvider],
  exports: [ExternalServiceProvider],
})
export class ExternalServiceModule {}
```

### Integrated External Services

| Service | Purpose | Integration Type | Fallback |
|--------|-------|-----------------|----------|
| Email Service | Notifications | REST API | Queue + Retry |
| Payment Processing | Subscriptions | REST API | Asynchronous Processing |
| Analytics | Usage Statistics | REST API | Local Buffering |
| File Storage | Document Management | REST API | Local Storage |
| Authentication | SSO (optional) | OAuth 2.0 | Local Auth |

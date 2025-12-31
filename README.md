# Thrico Backend

Multi-client Node.js backend infrastructure with GraphQL servers, gRPC microservices, and multi-database support.

## Architecture

This project provides a scalable backend architecture with:

- **3 GraphQL APIs** for different clients (User, Mobile, Entity Admin)
- **gRPC Microservice** for inter-service communication
- **Multi-region PostgreSQL** with Drizzle ORM (India, US, UAE)
- **DynamoDB** with Dynamoose for activity tracking and audit logs
- **Redis** for caching and session management
- **Docker Compose** for local development
- **Winston** centralized logging

## Project Structure

```
thrico-backend/
├── packages/               # Shared packages
│   ├── shared/            # Types, constants, utilities
│   ├── database/          # Database models and connections
│   ├── grpc/              # gRPC proto definitions and clients
│   └── logging/           # Winston logger configuration
├── services/              # Microservices
│   ├── user-graphql/      # User-facing GraphQL API (port 4001)
│   ├── mobile-graphql/    # Mobile-optimized GraphQL API (port 4002)
│   ├── admin-graphql/     # Entity Admin GraphQL API (port 4003)
│   └── grpc-service/      # gRPC microservice (port 50051)
└── docker-compose.yml     # Docker services configuration
```

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker and Docker Compose

## Quick Start

### 1. Environment Setup

```bash
# Copy environment variables template
cp .env.example .env

# Edit .env with your configurations
nano .env
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Infrastructure with Docker

```bash
# Start all services (PostgreSQL, Redis, DynamoDB, GraphQL, gRPC)
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### 4. Run Database Migrations

```bash
npm run migrate
```

### 5. Development Mode (Local)

```bash
# Start all services in development mode
npm run dev

# Or start individual services
npm run dev:user     # User GraphQL on port 4001
npm run dev:mobile   # Mobile GraphQL on port 4002
npm run dev:admin    # Admin GraphQL on port 4003
npm run dev:grpc     # gRPC service on port 50051
```

## GraphQL API Endpoints

- **User API**: http://localhost:4001/graphql
- **Mobile API**: http://localhost:4002/graphql
- **Admin API**: http://localhost:4003/graphql

### Health Checks

- http://localhost:4001/health
- http://localhost:4002/health
- http://localhost:4003/health

## Database Configuration

### PostgreSQL - Multi-Region

The system supports three PostgreSQL databases for different regions:

- **India** (port 5432)
- **US** (port 5433)
- **UAE** (port 5434)

Users are automatically routed to the appropriate database based on their region.

### DynamoDB

- **Local Development**: DynamoDB Local on port 8000
- **Production**: AWS DynamoDB (configure in `.env`)

Models:
- `UserActivity` - User activity tracking
- `AuditLog` - System audit logs

### Redis

- **Port**: 6379
- **Usage**: Session management and caching

## Authentication

All GraphQL APIs use JWT-based authentication:

1. **Register/Login** to get access and refresh tokens
2. **Include token** in requests: `Authorization: Bearer <token>`
3. **Refresh token** when access token expires

### Example: User Registration

```graphql
mutation {
  register(input: {
    email: "user@example.com"
    username: "johndoe"
    password: "SecurePass123"
    firstName: "John"
    lastName: "Doe"
    region: INDIA
  }) {
    user {
      id
      email
      username
    }
    accessToken
    refreshToken
    expiresIn
  }
}
```

### Example: Login

```graphql
mutation {
  login(input: {
    email: "user@example.com"
    password: "SecurePass123"
  }) {
    user {
      id
      email
      role
    }
    accessToken
    refreshToken
  }
}
```

## gRPC Service

The gRPC service provides:

- **UserService**: User CRUD operations
- **EntityService**: Entity CRUD operations

### Proto File

Located at: `packages/grpc/proto/service.proto`

### Using gRPC Client

```typescript
import { grpcClient } from '@thrico/grpc';

// Get user
const response = await grpcClient.getUser('user-id');

// Create user
const newUser = await grpcClient.createUser({
  email: 'user@example.com',
  username: 'johndoe',
  password: 'password',
  first_name: 'John',
  last_name: 'Doe',
  region: 'india',
});
```

## Logging

All services use Winston for structured logging:

- **Console**: Colored output in development
- **Files**: Daily rotating files in `./logs/`
  - `error-YYYY-MM-DD.log` - Error logs
  - `combined-YYYY-MM-DD.log` - All logs
  - `http-YYYY-MM-DD.log` - HTTP request logs

## Scripts

```bash
# Development
npm run dev                 # Start all services in dev mode
npm run dev:user           # Start user GraphQL service
npm run dev:mobile         # Start mobile GraphQL service
npm run dev:admin          # Start admin GraphQL service
npm run dev:grpc           # Start gRPC service

# Build
npm run build              # Build all packages and services

# Database
npm run migrate            # Run migrations on all regions
npm run test:db            # Test database connections

# Docker
npm run docker:up          # Start all Docker services
npm run docker:down        # Stop all Docker services
npm run docker:build       # Rebuild Docker images
npm run docker:logs        # View Docker logs

# Cleanup
npm run clean              # Clean all build artifacts
```

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Node Environment
NODE_ENV=development

# GraphQL Servers
USER_GRAPHQL_PORT=4001
MOBILE_GRAPHQL_PORT=4002
ADMIN_GRAPHQL_PORT=4003

# gRPC
GRPC_PORT=50051
GRPC_HOST=localhost

# PostgreSQL (India)
DB_INDIA_HOST=localhost
DB_INDIA_PORT=5432
DB_INDIA_USER=thrico_user
DB_INDIA_PASSWORD=thrico_password
DB_INDIA_NAME=thrico_india

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# DynamoDB
DYNAMODB_LOCAL=true
DYNAMODB_ENDPOINT=http://localhost:8000

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
```

## Production Deployment

### Build Docker Images

```bash
npm run docker:build
```

### Deploy with Docker Compose

```bash
# Production mode
NODE_ENV=production docker-compose up -d
```

### Environment Setup for Production

1. Set `NODE_ENV=production`
2. Update database URLs to production databases
3. Set strong JWT secrets
4. Configure AWS DynamoDB credentials
5. Set `DYNAMODB_LOCAL=false`
6. Update CORS origins

## Security

- **Helmet** for HTTP security headers
- **Rate Limiting** on all GraphQL endpoints
- **JWT Authentication** with refresh tokens
- **Password Hashing** with bcrypt
- **Input Validation** on all mutations
- **Role-Based Access Control** (RBAC) for admin operations

## Multi-Region Support

The system automatically routes database queries based on user region:

1. User registers/logs in with a specific region
2. JWT token includes region information
3. Database queries are routed to the appropriate regional database
4. All GraphQL services support multi-region operations

## Monitoring and Health Checks

Each service exposes a `/health` endpoint:

```bash
curl http://localhost:4001/health
# Response: {"status":"ok","service":"user-graphql"}
```

Docker health checks are configured for all services.

## Troubleshooting

### Database Connection Issues

```bash
# Test database connections
npm run test:db

# Check Docker logs
docker-compose logs postgres-india
docker-compose logs postgres-us
docker-compose logs postgres-uae
```

### Redis Connection Issues

```bash
# Check Redis container
docker-compose logs redis

# Test Redis connection
redis-cli ping
```

### DynamoDB Issues

```bash
# Check DynamoDB Local
docker-compose logs dynamodb-local

# List tables (local)
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

## License

MIT

## Support

For issues and questions, please create an issue in the repository.

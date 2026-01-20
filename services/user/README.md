# User Service

User-facing GraphQL API service for the Thrico backend.

## Overview

The User service provides a GraphQL API for user-related operations. It runs on port 2222 and follows the same architecture as the admin-graphql service.

## Port Configuration

- **Default Port**: 2222
- **Environment Variable**: `USER_GRAPHQL_PORT`

## API Endpoints

- **GraphQL**: `http://localhost:2222/graphql`
- **Health Check**: `http://localhost:2222/health`

## Features

- ✅ GraphQL API with Apollo Server
- ✅ Express middleware stack
- ✅ JWT authentication with encryption
- ✅ Redis caching for performance
- ✅ Rate limiting and security headers
- ✅ Request/response logging
- ✅ Multi-region database support

## Development

### Start Development Server

```bash
# From project root
pnpm --filter user dev

# Or using workspace
cd services/user
pnpm dev
```

### Build

```bash
pnpm --filter user build
```

### Run Production

```bash
pnpm --filter user start
```

## Docker

### Build Image

```bash
docker build -f services/user/Dockerfile -t thrico-user .
```

### Run Container

```bash
docker run -p 2222:2222 --env-file .env thrico-user
```

## Project Structure

```
services/user/
├── src/
│   ├── server.ts              # Express + Apollo Server setup
│   ├── schema/
│   │   ├── typeDefs.ts        # GraphQL schema definitions
│   │   └── resolvers.ts       # GraphQL resolvers
│   ├── utils/
│   │   ├── auth/
│   │   │   └── checkAuth.utils.ts
│   │   ├── crypto/
│   │   │   └── jwt.crypto.ts
│   │   ├── generateJwtToken.utils.ts
│   │   └── slug.utils.ts
│   └── lib/
│       └── redis-cache.ts     # Redis caching layer
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Adding New Features

### 1. Define GraphQL Types

Edit `src/schema/typeDefs.ts`:

```typescript
export const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    username: String!
  }

  type Query {
    health: String
    me: User
  }
`;
```

### 2. Implement Resolvers

Edit `src/schema/resolvers.ts`:

```typescript
export const resolvers = {
  Query: {
    health: () => "User service is healthy",
    me: async (_, __, context) => {
      // Access authenticated user from context
      return context.user;
    },
  },
};
```

### 3. Add Business Logic

Create logic files following the admin-graphql pattern:

```
src/logic/
└── user/
    └── profile.ts
```

## Environment Variables

Required environment variables:

```bash
USER_GRAPHQL_PORT=2222
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
JWT_SECRET=your-secret-key
```

## Authentication

The service uses JWT authentication with token encryption. Include the authorization header:

```
Authorization: Bearer <encrypted-token>
```

## Caching

Redis caching is implemented via `UserCache` class:

```typescript
import { UserCache } from "./lib/redis-cache";

const cache = new UserCache();
await cache.setUser(userId, userData);
const user = await cache.getUser(userId);
```

## Health Check

```bash
curl http://localhost:2222/health
# Response: {"status":"ok","service":"user"}
```

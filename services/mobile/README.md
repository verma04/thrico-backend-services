# Mobile Service

Mobile-optimized GraphQL API service for the Thrico backend.

## Overview

The Mobile service provides a GraphQL API optimized for mobile applications. It runs on port 3333 and includes session management for mobile clients.

## Port Configuration

- **Default Port**: 3333
- **Environment Variable**: `MOBILE_GRAPHQL_PORT`

## API Endpoints

- **GraphQL**: `http://localhost:3333/graphql`
- **Health Check**: `http://localhost:3333/health`

## Features

- ✅ GraphQL API with Apollo Server
- ✅ Express middleware stack
- ✅ JWT authentication with encryption
- ✅ Redis caching with session management
- ✅ Rate limiting and security headers
- ✅ Request/response logging
- ✅ Multi-region database support
- ✅ Mobile-optimized responses

## Development

### Start Development Server

```bash
# From project root
pnpm --filter mobile dev

# Or using workspace
cd services/mobile
pnpm dev
```

### Build

```bash
pnpm --filter mobile build
```

### Run Production

```bash
pnpm --filter mobile start
```

## Docker

### Build Image

```bash
docker build -f services/mobile/Dockerfile -t thrico-mobile .
```

### Run Container

```bash
docker run -p 3333:3333 --env-file .env thrico-mobile
```

## Project Structure

```
services/mobile/
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
│       └── redis-cache.ts     # Redis caching with sessions
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Adding New Features

### 1. Define GraphQL Types

Edit `src/schema/typeDefs.ts`:

```typescript
export const typeDefs = `#graphql
  type MobileUser {
    id: ID!
    email: String!
    username: String!
    deviceId: String
  }

  type Query {
    health: String
    me: MobileUser
  }
`;
```

### 2. Implement Resolvers

Edit `src/schema/resolvers.ts`:

```typescript
export const resolvers = {
  Query: {
    health: () => "Mobile service is healthy",
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
└── mobile/
    └── session.ts
```

## Environment Variables

Required environment variables:

```bash
MOBILE_GRAPHQL_PORT=3333
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
JWT_SECRET=your-secret-key
```

## Authentication

The service uses JWT authentication with token encryption. Include the authorization header:

```
Authorization: Bearer <encrypted-token>
```

## Session Management

The mobile service includes Redis-based session management:

```typescript
import { MobileCache } from "./lib/redis-cache";

const cache = new MobileCache();
await cache.setSession(sessionId, sessionData);
const session = await cache.getSession(sessionId);
```

## Caching

Mobile-specific caching for better performance:

```typescript
import { MobileCache } from "./lib/redis-cache";

const cache = new MobileCache();
await cache.setMobileUser(userId, userData);
const user = await cache.getMobileUser(userId);
```

## Health Check

```bash
curl http://localhost:3333/health
# Response: {"status":"ok","service":"mobile"}
```

## Mobile-Specific Considerations

- Optimized for bandwidth-constrained networks
- Session management for offline/online sync
- Efficient caching strategies
- Support for push notifications (to be implemented)
- Background sync capabilities (to be implemented)

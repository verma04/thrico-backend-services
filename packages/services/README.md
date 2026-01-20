# @thrico/services

Shared service layer for Thrico backend microservices.

## Overview

This package contains all business logic services that can be used across multiple microservices (admin-graphql, user, mobile). All services use structured logging from `@thrico/logging` and follow consistent patterns for error handling and validation.

## Services

### SurveyService

- `getSurveyById` - Get survey by ID
- `getSurveyByEntityId` - Get all surveys for an entity
- `createSurvey` - Create a new survey

### StoryService

- `createStory` - Create a new story (24-hour expiry)
- `getStoriesGroupedByConnections` - Get stories from user's connections
- `getMyStories` - Get current user's active stories
- `deleteStory` - Delete a story

## Usage

```typescript
import { SurveyService, StoryService } from "@thrico/services";

// In your resolver
const surveys = await SurveyService.getSurveyByEntityId({
  entityId,
  db,
});

const story = await StoryService.createStory({
  db,
  userId,
  entityId,
  input: { image, caption },
  uploadFn: upload, // Inject your upload function
});
```

## Patterns

### Logging

All services use structured logging:

```typescript
log.debug("Operation starting", { userId, entityId });
log.info("Operation completed", { userId, result });
log.error("Operation failed", { error, context });
```

### Error Handling

All methods include try-catch blocks and proper GraphQL errors:

```typescript
try {
  // ... operation
} catch (error) {
  log.error("Error in method", { error, params });
  throw error;
}
```

### Input Validation

All required parameters are validated:

```typescript
if (!requiredParam) {
  throw new GraphQLError("Parameter is required.", {
    extensions: { code: "BAD_USER_INPUT" },
  });
}
```

## Adding New Services

1. Create a new directory in `src/` (e.g., `src/profile/`)
2. Create the service file (e.g., `profile.service.ts`)
3. Follow the established patterns for logging and error handling
4. Export from `src/index.ts`

## Dependencies

- `@thrico/database` - Database schema and types
- `@thrico/logging` - Structured logging
- `@thrico/shared` - Shared utilities
- `drizzle-orm` - ORM for database queries
- `graphql` - GraphQL error types

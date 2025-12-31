const eventTypes = `#graphql
  enum Visibility {
    PUBLIC
    PRIVATE
  }

  enum CommunityEntityStatus {
    APPROVED
    BLOCKED
    PENDING
    REJECTED
    DISABLED
    PAUSED
  }

  # ---------- OBJECT TYPES ----------
  type Location {
    lat: Float
    lng: Float
    name: String
  }

  type EventVerification {
    id: ID!
    eventId: ID!
    isVerified: Boolean!
    verifiedBy: ID
    isVerifiedAt: String
    verificationReason: String
  }

  type Event {
    id: ID!
    title: String!
    slug: String!
    description: String
    cover: String
    entityId: ID!
    status: CommunityEntityStatus
    updatedAt: String
    createdAt: String
    startDate: String
    endDate: String
    startTime: String
    type: String
    lastDateOfRegistration: String
    location: JSON
    visibility: Visibility
    verification: EventVerification
  }

  type EventStats {
    total: Int!
    approved: Int!
    pending: Int!
    rejected: Int!
    blocked: Int!
    disabled: Int!
    paused: Int!
  }

  type PaginatedEvents {
    events: [Event!]!
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  # ---------- INPUT TYPES ----------
  input LocationInput {
    lat: Float
    lng: Float
    name: String
  }

  input GetAllEventsInput {
    status: CommunityEntityStatus
  }

  input ChangeEventStatusInput {
    action: String!
    reason: String
    eventId: ID!
  }

  input PostEventInput {
    title: String!
    location: JSON
    description: String
    startDate: String
    endDate: String
    startTime: String
    type: String!
    lastDateOfRegistration: String
    coverImage: Upload
    visibility: Visibility
  }

  extend type Query {
    # Get all events with filtering and pagination
    getAllEvents(input: GetAllEventsInput): [Event]

    # Get paginated events
    getEventsPaginated(input: GetAllEventsInput): PaginatedEvents

    # Get single event by ID
    getEventById(id: ID!): Event

    # Get single event by slug
    getEventBySlug(slug: String!): Event

    # Get events statistics
    getEventsStats: EventStats

    # Get events by entity
    getEventsByEntity(entityId: ID!, status: CommunityEntityStatus): [Event]

    # Get upcoming events
    getUpcomingEvents(limit: Int): [Event]

    # Get past events
    getPastEvents(limit: Int): [Event]

    # Search events
    searchEvents(query: String!, limit: Int): [Event]

    # Get events requiring verification
    getEventsForVerification: [Event]

    # Get events by date range
    getEventsByDateRange(startDate: String!, endDate: String!): [Event]

    # Get events by type
    getEventsByType(type: String!, status: CommunityEntityStatus): [Event]
  }

  extend type Mutation {
    addEvent(input: PostEventInput): Event

    changeEventStatus(input: ChangeEventStatusInput!): Event

    changeEventVerification(
      eventId: ID!
      isVerified: Boolean!
      verificationReason: String
    ): Event

    # Bulk operations
    bulkChangeEventStatus(
      eventIds: [ID!]!
      status: CommunityEntityStatus!
      reason: String
    ): [Event]

    # Delete event
    deleteEvent(eventId: ID!): Boolean

    # Update event
    updateEvent(eventId: ID!, input: PostEventInput!): Event
  }
`;

export { eventTypes };

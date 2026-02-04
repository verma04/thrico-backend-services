export const eventsTypes = `#graphql
  type events {
    id: ID
  }

  input locationInput {
    address: String!
    latitude: Float!
    longitude: Float!
    name: String!
  }

  type location {
    address: String
    latitude: Float
    longitude: Float
    name: String
  }

  input inputAddEvent {
    cover: Upload
    title: String!
    description: String!
    endDate: String!
    lastDateOfRegistration: String!
    startDate: Date!
    startTime: String!
    type: String!
    location: JSON!
  }
  type event {
    cover: String
    type: String
    title: String
    description: String
    endDate: Date
    lastDateOfRegistration: Date
    startDate: Date
    startTime: String
    location: JSON
    numberOfAttendees: Int
    numberOfPost: Int
    numberOfViews: Int
  }

  type eventList {
    id: ID
    isFeatured: Boolean
    isWishList: Boolean
    isTrending: Boolean
    isOwner: Boolean
    canReport: Boolean
    canDelete: Boolean
    details: event
    postedBy: user
  }

  type eventListWithPagination {
    events: [eventList]
    pagination: paginationInfo
  }
  type allEvents {
    id: ID
    isFeatured: Boolean
    isWishList: Boolean
    isTrending: Boolean
    details: event
  }
  input inputGetEvents {
    page: Int
    limit: Int
  }
  input inputGetEventDetailsById {
    id: ID!
  }

  extend type Query {
    getAllEvents(input: inputGetEvents): eventListWithPagination
    getEventDetailsById(input: inputGetEventDetailsById): eventList
  }

  type EventStatus {
    success: Boolean
    message: String
  }

  extend type Mutation {
    createEvent(input: inputAddEvent!): [events]
    wishListEvent(input: inputId): EventStatus
  }

  type EventSpeaker {
    id: ID!
    eventId: ID
    name: String!
    email: String
    bio: String
    title: String
    company: String
    avatar: String
    socialLinks: JSON
    isFeatured: Boolean
    createdAt: String
    updatedAt: String
  }

  input AddSpeakerInput {
    name: String!
    email: String
    bio: String
    title: String
    company: String
    avatar: String
    socialLinks: JSON
    isFeatured: Boolean
  }

  input EditSpeakerInput {
    name: String
    email: String
    bio: String
    title: String
    company: String
    avatar: String
    socialLinks: JSON
    isFeatured: Boolean
  }

  type SpeakerPagination {
    speakers: [EventSpeaker]
    pagination: SpeakerPaginationInfo
  }
  
  type SpeakerPaginationInfo {
      page: Int
      limit: Int
      count: Int
  }

  input inputGetSpeakersByEvent {
    eventId: ID!
    page: Int
    limit: Int
  }
  input inputRemoveSpeaker {
    eventId: ID!
    speakerId: ID!
  }

  input inputSpeakerId {
    speakerId: ID!
  }

  input inputAddEventSpeaker {
    eventId: ID!
    speakerData: AddSpeakerInput!
  }
  input inputEditEventSpeaker {
    eventId: ID!
    speakerId: ID!
    updateData: EditSpeakerInput!
  }
  input inputMarkSpeakerFeatured {
    eventId: ID!
    speakerId: ID!
  }
  input inputUnfeatureSpeaker {
    eventId: ID!
    speakerId: ID!
  }
  extend type Query {
    getSpeakersByEvent(input: inputGetSpeakersByEvent): SpeakerPagination
  }

  extend type Mutation {
    addSpeaker(input: inputAddEventSpeaker!): EventSpeaker
    editSpeaker(input: inputEditEventSpeaker!): EventSpeaker
    removeSpeaker(input: inputRemoveSpeaker!): EventStatus
    markSpeakerFeatured(input: inputMarkSpeakerFeatured): EventSpeaker
    unfeatureSpeaker(input: inputUnfeatureSpeaker): EventSpeaker
  }

  input inputGetTeamMemberRole {
    eventId: ID!
    userId: ID!
  }

  type TeamMemberRoleResult {
    role: String
    permissions: [String!]
  }

  extend type Query {
    getTeamMemberRole(input: inputGetTeamMemberRole!): TeamMemberRoleResult
  }

  input SearchConnectionsInput {
    eventId: ID!
    limit: Int
    offset: Int
    search: String
  }

  type ConnectionUser {
    id: ID!
    userId: ID!
    firstName: String
    lastName: String
    avatar: String
    cover: String
    designation: String
    isOnline: Boolean
    connectedAt: String
    status: String
    isMember: Boolean!
  }

  type PaginationInfo {
    total: Int
    limit: Int
    offset: Int
    hasMore: Boolean
  }

  type SearchConnectionsForEventTeamResult {
    data: [ConnectionUser!]!
    pagination: PaginationInfo!
  }

  extend type Query {
    searchConnectionsForEventTeam(
      input: SearchConnectionsInput!
    ): SearchConnectionsForEventTeamResult!
  }

  # Add this input for editing general info
  input inputEditEventGeneralInfo {
    eventId: ID!
    details: EditEventGeneralInfoInput!
  }

  input EditEventGeneralInfoInput {
    title: String
    description: String
    startDate: String
    endDate: String
    startTime: String
    timezone: String
    eventType: String
    seatLimit: Int
    registrationOpen: Boolean
  }

  # Add this mutation to your Mutation type
  extend type Mutation {
    editEventGeneralInfo(input: inputEditEventGeneralInfo!): event
  }
`;

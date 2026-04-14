export const liveTypes = `#graphql
  type LiveSession {
    id: ID!
    hostId: String!
    host: entityUser # This links to existing entityUser type
    title: String
    coverImage: String
    viewerCount: Int
    isLive: Boolean
    serverUrl: String # The Mediasoup signaling server URL
    startedAt: Date
  }

  type LiveSessionsResponse {
    sessions: [LiveSession]
    pageInfo: PageInfo # Reusing PageInfo from typeDefs
  }

  extend type Query {
    getActiveLiveSessions(limit: Int, cursor: String): LiveSessionsResponse
    getLiveSession(id: ID!): LiveSession
  }

  extend type Mutation {
    startLiveSession(title: String, coverImage: String): LiveSession
    endLiveSession(id: ID!): GenericResponse
  }
`;

export const nearbyUsersTypes = `#graphql
  enum NearbyDiscoveryPrivacy {
    VISIBLE
    APPROXIMATE
    HIDDEN
  }

  type NearbyUser {
    id: ID!
    firstName: String!
    lastName: String!
    avatar: String
    headline: String
    distance: Int
    latitude: Float
    longitude: Float
    privacy: NearbyDiscoveryPrivacy
    mutualCommunities: Int
    mutualInterests: Int
  }

  type NearbyUsersResponse {
    cityId: ID
    cityName: String
    users: [NearbyUser!]!
    nextCursor: String
  }

  type UserLocation {
    id: ID!
    latitude: Float!
    longitude: Float!
  }

  type NearbyCommunity {
    id: ID!
    title: String!
    slug: String!
    cover: String
    description: String
    category: [String]
    numberOfUser: Int
    distance: Int
  }

  type NearbyEvent {
    id: ID!
    title: String!
    slug: String!
    cover: String
    type: String
    startDate: String
    distance: Int
  }

  type NearbyMentor {
    id: ID!
    mentorId: ID!
    firstName: String!
    lastName: String!
    avatar: String
    headline: String
    category: String
    skills: [String]
    distance: Int
  }

  type NearbySettings {
    privacy: NearbyDiscoveryPrivacy!
  }

  input GetNearbyUsersInput {
    latitude: Float!
    longitude: Float!
    limit: Int
    cursor: String
  }

  extend type Query {
    getNearbyUsers(input: GetNearbyUsersInput!): NearbyUsersResponse!
    getNearbyCommunities(input: GetNearbyUsersInput!): [NearbyCommunity!]!
    getNearbyEvents(input: GetNearbyUsersInput!): [NearbyEvent!]!
    getNearbyMentors(input: GetNearbyUsersInput!): [NearbyMentor!]!
    getMyNearbySettings: NearbySettings!
    getMyLocation: UserLocation
  }

  extend type Mutation {
    updateNearbySettings(privacy: NearbyDiscoveryPrivacy!): NearbySettings!
    updateMyNearbyLocation(latitude: Float!, longitude: Float!): GenericResponse!
  }
`;

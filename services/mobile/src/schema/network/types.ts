export const networkTypes = `#graphql
  type networkUser {
    id: ID
    firstName: String
    avatar: String
    lastName: String
   
    user: profileCreation
    status: connectionStatus
    isOnline: Boolean
    activity: [feed]
    designation: String
    cover: String
    connectedAt: Date
    mutualFriends: mutualFriends
    isFollowing: Boolean
    numberOfConnections: Int
    isCloseFriend: Boolean
  }

  enum connectionStatus {
    NO_CONNECTION
    CONNECTED
    REQUEST_RECEIVED
    REQUEST_SEND
  }

  type connectionRequest {
    id: ID
    senderId: ID
    receiverId: ID
    status: String
    createdAt: Date
    firstName: String
    lastName: String
    avatar: String
    designation: String
    mutualFriends: mutualFriends
    isCloseFriend: Boolean
  }

  type about {
    currentPosition: String
    linkedin: String
    instagram: String
    portfolio: String
    about: String
  }

  type profile {
    experience: JSON
    education: JSON
    DOB: String
       socialLinks: JSON
         skills: JSON
  }

  type network {
    id: String
    description: String
    user: networkUser
    createdAt: Date
  }

  input NetworkCursorInput {
    cursor: String
    limit: Int
    search: String
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type NetworkUserEdge {
    cursor: String!
    node: networkUser!
  }

  type NetworkUserConnection {
    edges: [NetworkUserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type ConnectionRequestEdge {
    cursor: String!
    node: connectionRequest!
  }

  type ConnectionRequestConnection {
    edges: [ConnectionRequestEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type paginationInfo {
    total: Int
    limit: Int
    offset: Int
    hasMore: Boolean
    hasPreviousPage: Boolean
    hasNextPage: Boolean
     totalCount:Int
     totalPages:Int
     currentPage:Int
  }

  type connectionRequestResponse {
    data: [connectionRequest]
    pagination: paginationInfo
  }

  type connectionStats {
    totalConnections: Int
    pendingRequests: Int
  }

  input reportProfileInput {
    userId: ID!
    reason: String!
    description: String
  }

  input blockUserInput {
    userId: ID!
  }

  type reportResponse {
    success: Boolean
    message: String
  }

  type blockedUser {
    id: ID
    firstName: String
    lastName: String
    avatar: String
    blockedAt: Date
  }

  type BlockedUserEdge {
    cursor: String!
    node: blockedUser!
  }

  type BlockedUserConnection {
    edges: [BlockedUserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }


  input followUserInput {
    userId: ID!
  }

  type mutualFriends {
    count: Int
    friends: [networkUser]
  }
  type followResponse {
    success: Boolean
    message: String
    id: ID
  }

  # Added missing types
  type profileCreation {
    id: ID
    firstName: String
    lastName: String
    avatar: String
    email: String
    about: about
    profile: profile
    cover: String
    location: JSON

  }

  # feed type is defined in feed/types.ts
  
  extend type Query {
    getNetwork(input: NetworkCursorInput): NetworkUserConnection!
    getMyConnection(input: NetworkCursorInput): NetworkUserConnection!
    getNetworkUserProfile(input: inputId): networkUser
    getUserProfile(input: inputId): networkUser
    getConnectionRequests(input: NetworkCursorInput): ConnectionRequestConnection!
    getBlockedUsers(input: NetworkCursorInput): BlockedUserConnection!
    getConnectionStats: connectionStats
    getCloseFriends(input: NetworkCursorInput): NetworkUserConnection!
  }

  extend type Mutation {
    connectAsConnection(input: inputId): networkUser
    acceptConnection(input: inputId): networkUser
    rejectConnection(input: inputId): networkUser
    withdrawConnection(input: inputId): networkUser
    removeConnection(input: inputId): networkUser
    reportProfile(input: reportProfileInput): reportResponse
    blockUser(input: blockUserInput): reportResponse
    unblockUser(input: blockUserInput): reportResponse
    followUser(input: followUserInput): followResponse
    unfollowUser(input: followUserInput): followResponse
    addToCloseFriend(input: inputId): followResponse
    removeFromCloseFriend(input: inputId): followResponse
  }

  enum BirthdayFilter {
    TODAY
    UPCOMING
    THIS_MONTH
    PAST
  }

  input BirthdayCursorInput {
    cursor: String
    limit: Int
    filter: BirthdayFilter!
  }

  type BirthdayEdge {
    cursor: String!
    node: networkUser!
  }

  type BirthdayConnection {
    edges: [BirthdayEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  extend type Query {
    getMemberBirthdays(input: BirthdayCursorInput): BirthdayConnection!
  }
`;

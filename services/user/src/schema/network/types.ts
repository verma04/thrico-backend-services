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
  }

  type about {
    currentPosition: String
    linkedin: String
    instagram: String
    portfolio: String
    about: String
  }

  type profile {
    experience: String
    education: String
  }

  type network {
    id: String
    description: String
    user: networkUser
    createdAt: Date
  }

  input paginationInput {
    limit: Int
    offset: Int
    search: String
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

  type networkResponse {
    data: [networkUser]
    pagination: paginationInfo
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

  type blockedUsersResponse {
    data: [blockedUser]
    pagination: paginationInfo
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
  }

  # feed type is defined in feed/types.ts
  
  extend type Query {
    getNetwork(input: paginationInput): networkResponse
    getMyConnection(input: paginationInput): networkResponse
    getUserProfile(input: inputId): networkUser
    getConnectionRequests(input: paginationInput): connectionRequestResponse
    getConnectionStats: connectionStats
    getBlockedUsers(input: paginationInput): blockedUsersResponse
    getCloseFriends(input: paginationInput): networkResponse
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
`;

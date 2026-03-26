export const typeDefs = `#graphql
  scalar Upload
  scalar JSON
  scalar Date

  type success {
    id: ID!
    email: String!
  }
  type entityTheme {
    colorPrimary: String
    colorBgContainer: String
    primaryColor: String
    secondaryColor: String
    backgroundColor: String
    textColor: String
    buttonColor: String
    borderRadius: Int
    borderWidth: Int
    borderStyle: String
    borderColor: String
    inputBackground: String
    inputBorderColor: String
    fontSize: Int
    fontWeight: String
    boxShadow: String
    hoverEffect: String
  }
  type chooseAccount {
    token: String
    theme: entityTheme
    isDeletionPending: Boolean
    deletionRequestedAt: Date
    isActive: Boolean
  }
  type token {
    token: String
  }
  type id {
    id: String
  }
  type otp {
    id: ID
    user: user
  }
  type entity {
    id: ID
    name: String
    logo: String
    lastActive: Date
    country: String
    isMember: Boolean
  }

  # Stub for user type if not defined elsewhere
  type user {
    id: ID
    email: String
    profile: userProfile
  }

  input inputId {
    id: ID!
  }
  input inputAccount {
    userId: ID!
    entityId: ID!
    device_id: String
    deviceType: String
    deviceToken: String
    deviceName: String
    deviceOs: String
    country: String!
  }
  input inputSwitchAccount {
    entityId: ID!
    device_id: String
    deviceType: String
    deviceToken: String
    deviceName: String
  }
  type theme {
    id: ID
    colorPrimary: String
    borderRadius: String
    colorBgContainer: String
  }

  type entityUser {
    id: ID
    email: String
    firstName: String
    lastName: String
    isApproved: Boolean
    isRequested: Boolean
    avatar: String
    about: aboutUser
    cover: String
    location: JSON
    profile: profile
    isActive: Boolean
    isDeletionPending: Boolean
    deletionRequestedAt: Date
    status: String
  }
  type aboutUser {
    headline: String
    bio: String
  }


  input CheckUserEntityInput {
    id: ID!
    cursor: String
    limit: Int
    searchTerm: String
  }

  type CheckUserEntityResponse {
    entities: [entity]
    pageInfo: PageInfo
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type Query {
    health: String
    getUser: entityUser
    checkOtpId(input: inputId): otp
    checkUserEntity(input: CheckUserEntityInput): CheckUserEntityResponse
    checkUserEntitySignup(input: CheckUserEntityInput): CheckUserEntityResponse
    getSignupProfile(id: ID!): entityUser
    getOrgDetails: entity
    checkAllUserAccount: [entity]
    getEntityTheme: theme
    checkUserOnline: checkUserOnlineResponse
    getEntityModuleAccess(moduleName: ModuleName!): Boolean
  }

  enum ModuleName {
    COMMUNITY
    EVENTS
    FORUM
    JOBS
    MENTORSHIP
    LISTING
    SHOP
    OFFERS
    SURVEYS
    POLLS
    STORIES
    FEED

   
  }

  type checkUserOnlineResponse {
    status: Boolean
  }

  input kyc {
    affliction: [String]!
    referralSource: [String]!
    comment: String!
    agreement: Boolean!
    identificationNumber: String
  }
  input inputLoginWithEmail {
    email: String
  }

  input inputLoginWithOtp {
    otp: String!
    id: ID!
  }

  # Add signup input type
  input inputSignup {
   
    email: String!
   
  }

  type Mutation {
    loginWithEmail(input: inputLoginWithEmail): success
    loginByOtp(input: inputLoginWithOtp): id
    chooseAccount(input: inputAccount): chooseAccount
    chooseAccountSignup(input: inputAccount): chooseAccount
    switchAccount(input: inputSwitchAccount): chooseAccount
    signupWithEmail(input: inputSignup): success # Add signup mutation
    registerDeviceToken(token: String!, deviceId: String, deviceOs: String): GenericResponse
    updateActiveEntity(entityId: ID!): GenericResponse
    logoutUser: GenericResponse
    allowPushNotification(token: String!): GenericResponse
    requestAccountDeletion: GenericResponse
    restoreAccount: GenericResponse
    deactivateAccount: GenericResponse
    reactivateAccount: GenericResponse
    createProfile(input: CreateProfileInput): chooseAccount
  }

  input CreateProfileInput {
    firstName: String!
    lastName: String!
    dob: String
    phone: String
    headline: String
    about: String
    location: JSON
    socialLinks: [SocialInput]
    userId: ID!
    entityId: ID!
    deviceOs: String
    deviceName: String
    device_id: String
    deviceType: String
    deviceToken: String
    country: String!
  }

  input SocialInput {
    platform: String!
    url: String!
  }

  type Subscription {
    _empty: String
  }

  type GenericResponse {
    success: Boolean!
    message: String
  }
`;

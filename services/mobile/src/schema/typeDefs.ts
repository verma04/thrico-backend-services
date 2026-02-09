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
  }
  type aboutUser {
    headline: String
    bio: String
  }

  type modules {
    name: String
    icon: String
    showInMobileNavigation: Boolean
    isPopular: Boolean
    showInMobileNavigationSortNumber: Int
    enabled: Boolean
  }
  type checkSubscription {
    status: Boolean
    modules: [modules]
  }

  type Query {
    health: String
    getUser: entityUser
    checkOtpId(input: inputId): otp
    checkUserEntity(input: inputId): [entity]
    checkUserEntitySignup(input: inputId): [entity]
    getOrgDetails: entity
    checkAllUserAccount: [entity]
    getEntityTheme: theme
    checkSubscription: checkSubscription
    checkUserOnline: checkUserOnlineResponse
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
    firstName: String!
    lastName: String!
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
  }

  type Subscription {
    _empty: String
  }

  type GenericResponse {
    success: Boolean!
    message: String
  }
`;

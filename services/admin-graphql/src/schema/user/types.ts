export const userTypes = `#graphql
  # scalar JSON is already defined in main typeDefs
  scalar Date
  type userToEntity {
    verification: verification
    isApproved: Boolean
    isRequested: Boolean
    lastActive: Date
    user: User
    status: Status
    userKyc: userKyc
    id: ID
  }
  type userKyc {
    referralSource: [String]
    comment: String
    affliction: [String]
  }
  

   type User {
    isOnline: Boolean
    cover: String
    avatar: String
    location: JSON
    profile: userProfile
    about: about
  }

  type userProfile {
    country: String
    language: String
    phone: phone
    timeZone: String
    DOB: String!
    gender: String

    headline: String
    currentPosition: String
    education: [education]
    experience: [experience]
    categories: [String]
    skills: JSON
  }
  type verification {
    id: ID
    isVerifiedAt: Date
    isVerified: Boolean
    verificationReason: String
  }
  type social {
    url: String
    platform: String
  }
  type about {
    social: [social]
    pronouns: String
    headline: String
    currentPosition: String
    about: String
  }
  type education {
    id: String
    school: company
    degree: String
    grade: String
    activities: String
    description: String
    duration: [String]
  }

  type company {
    id: String
    name: String
    logo: String
  }
  type experience {
    id: String
    company: company
    duration: [String]
    employmentType: String

    locationType: String
    title: String
    startDate: String
    currentlyWorking: Boolean
    location: JSON
  }
  type userSetting {
    autoApprove: Boolean
  }
  type phone {
    areaCode: String
    countryCode: Int
    isoCode: String
    phoneNumber: String
  }
  input inputId {
    id: ID
  }
  enum Status {
    ALL
    APPROVED
    BLOCKED
    PENDING
    REJECTED
    FLAGGED
    ENABLED
    DISABLED
  }
  enum action {
    APPROVE
    BLOCK
    DISABLE
    ENABLE
    UNBLOCK
    REJECT
    FLAG
    VERIFY
    UNVERIFY
    REAPPROVE
  }
  input statusInput {
    action: action!
    userId: ID!
    reason: String!
  }
  input allStatusInput {
    status: Status!
    limit: Int
    offset: Int
  }
  input userSettings {
    autoApprove: Boolean
  }
  type getUserAnalytics {
    totalMembers: Int
    verifiedMembers: Int
    verifiedPercent: Int
    activeMembers: Int
    activePercent: Int
    newMembersThisMonth: Int
  }

  type UserGrowth {
    date: String
    count: Int
  }

  type UserRoleDistribution {
    name: String
    value: Int
  }
  extend type Query {
    getUserDetailsById(input: inputId): userToEntity
    getAllUser(input: allStatusInput): [userToEntity]
    getUserSettings: userSetting
    getUserAnalytics(timeRange: TimeRange): getUserAnalytics
    getUserGrowth(timeRange: TimeRange!): [UserGrowth]
    getUserRoleDistribution(timeRange: TimeRange!): [UserRoleDistribution]
  }

  extend type Mutation {
    changeUserStatus(input: statusInput): userToEntity
    updateUserSettings(input: userSettings): userSetting
    changeUserVerification(input: statusInput): userToEntity
  }
`;

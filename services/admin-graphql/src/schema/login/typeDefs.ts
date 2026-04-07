export const loginTypeDefs = `#graphql
  type AdminToken {
    id: ID
    status: Boolean
  }

  type JwtToken {
    token: String
  }

  type AdminAccount {
    id: ID
    entityId: ID
    name: String
    logo: String
    role: String
  }

  input AdminLoginInput {
    email: String!
 
  }

  input AdminOtpInput {
    id: ID!
    otp: String!
  }

  input AdminRegisterInput {
    email: String!
    firstName: String!
    lastName: String!
  
  }

  input RegisterEntityInput {
    name: String!
    entityType: String!
    industryType: ID!
    designation: String!
    website: String!
    country: String!
    language: String!
    address: String!
    logo: Upload
    domain: String!
    phone: JSON!
    agreement: Boolean
  }

  type AdminUserDetails {
    id: ID
    email: String
    firstName: String
    lastName: String
    role: String
  }

  extend type Query {
    getMyAccounts: [AdminAccount!]
    getMyOtherAccounts: [AdminAccount!]
    getLoginUserDetails: AdminUserDetails
  }

  extend type Mutation {
    logoutAdmin: SuccessResponse
    logoutAdminAllDevices: SuccessResponse
    registerAsAdmin(input: AdminRegisterInput): SuccessResponse
    adminLogin(input: AdminLoginInput): [AdminAccount!]
    sendAdminLoginOtp(input: AdminLoginInput): AdminToken
    otpLogin(input: AdminOtpInput): JwtToken
    loginByEntityId(entityId: ID!): JwtToken
    registerEntity(input: RegisterEntityInput): JwtToken
    switchToOtherAccount(entityId: ID!): JwtToken
  }
`;

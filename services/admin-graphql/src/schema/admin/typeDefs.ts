export const adminTypeDefs = `#graphql
  # Admin System Types
  type SuccessResponse {
    success: Boolean
  }

  type AdminToken {
    id: ID
    status: Boolean
  }

  type JwtToken {
    token: String
  }

  type AdminProfile {
    email: String
    firstName: String
    lastName: String
  }

  type AdminUser {
    id: ID
    status: Boolean
    email: String
    firstName: String
    lastName: String
  }

  # Admin Inputs
  input AdminRegisterInput {
    firstName: String!
    lastName: String!
    password: String!
    email: String!
    phone: String
  }

  input AdminLoginInput {
    email: String!
    password: String!
  }

  input AdminOtpInput {
    id: ID!
    otp: String!
  }

  input UpdateEntityModuleInput {
    id: ID!
    name: String
    icon: String
    required: Boolean
    showInMobileNavigation: Boolean
    showInWebNavigation: Boolean
    isEnabled: Boolean
    isPopular: Boolean
    showInMobileNavigationSortNumber: Int
  }

  extend type Query {
    getUser: AdminUser
    adminProfile: AdminProfile
  }

  extend type Mutation {
    logoutAdmin: SuccessResponse
    logoutAdminAllDevices: SuccessResponse
    loginAsAdmin(input: AdminLoginInput): AdminToken
    otpLogin(input: AdminOtpInput): JwtToken
    registerAsAdmin(input: AdminRegisterInput): SuccessResponse
    updateEntityModules(input: [UpdateEntityModuleInput]): SuccessResponse
    uploadImage(file: Upload!): String!
  }
`;

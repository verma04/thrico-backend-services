export const adminTypeDefs = `#graphql
  # Admin System Types
  type SuccessResponse {
    success: Boolean
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
    role: Role
    roleId: ID
    memberStatus: String
    # joinedAt: String
    isSuperAdmin: Boolean
    permissions: AdminAccess
    modulePermissions: [ModulePermission]
  }

  input AdminRegisterInput {
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    roleId: ID
  }

  input AdminUpdateInput {
    firstName: String
    lastName: String
    phone: String
    status: Boolean
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

   type HealthStatus {
    status: String!
    timestamp: String!
  }

  extend type Query {
    health: HealthStatus!
    getUser: AdminUser
    adminProfile: AdminProfile
    getAdminUsers: [AdminUser!]
    getMyAccounts: [AdminAccount!]
  }

  input inputUpdateEntityModule {
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
  extend type Mutation {
    updateEntityModule(input: [inputUpdateEntityModule]): SuccessResponse
    uploadImage(file: Upload!): String!
    updateAdminUserRole(adminId: ID!, roleId: ID!): AdminUser
    deleteAdminUser(adminId: ID!): SuccessResponse
    createAdmin(input: AdminRegisterInput!): AdminUser
    updateAdminUser(adminId: ID!, input: AdminUpdateInput!): AdminUser
    updateAdminPassword(adminId: ID!, password: String!): SuccessResponse
  }
`;

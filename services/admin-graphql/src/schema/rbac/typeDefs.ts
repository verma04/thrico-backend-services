export const rbacTypeDefs = `#graphql
  type Role {
    id: ID!
    name: String!
    description: String
    isSystem: Boolean
    adminAccess: AdminAccess
    modulePermissions: [ModulePermission!]
  }

  type AdminAccess {
    website: Boolean
    moderation: Boolean
    reports: Boolean
    settings: Boolean
    subscription: Boolean
    platformFeatures: Boolean
    appearance: Boolean
    auditLogs: Boolean
    domain: Boolean
    permissions: Boolean
    adminUsers: Boolean
  }

  input AdminAccessInput {
    website: Boolean
    moderation: Boolean
    reports: Boolean
    settings: Boolean
    subscription: Boolean
    platformFeatures: Boolean
    appearance: Boolean
    auditLogs: Boolean
    domain: Boolean
    permissions: Boolean
    adminUsers: Boolean
    general: Boolean
    module: Boolean
    billing: Boolean
    usersAndPermissions: Boolean
    taxesAndDuties: Boolean
    languages: Boolean
    customerPrivacy: Boolean
    policies: Boolean
    contactSupport: Boolean
    integrations: Boolean
  }

  type ModulePermission {
    id: ID!
    module: String!
    canRead: Boolean!
    canCreate: Boolean!
    canEdit: Boolean!
    canDelete: Boolean!
  }

  input ModulePermissionInput {
    module: String!
    canRead: Boolean
    canCreate: Boolean
    canEdit: Boolean
    canDelete: Boolean
  }

  input CreateRoleInput {
    name: String!
    description: String
    adminAccess: AdminAccessInput
    modulePermissions: [ModulePermissionInput!]
  }

  input UpdateRoleInput {
    id: ID!
    name: String
    description: String
    adminAccess: AdminAccessInput
    modulePermissions: [ModulePermissionInput!]
  }

  extend type Query {
    getRoles: [Role!]
    getRoleById(id: ID!): Role
    getAvailableModules: [String!]
  }

  extend type Mutation {
    createRole(input: CreateRoleInput!): Role
    updateRole(input: UpdateRoleInput!): Role
    deleteRole(id: ID!): SuccessResponse
  }
`;

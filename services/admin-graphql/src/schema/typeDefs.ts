import { adminTypeDefs } from "./admin/typeDefs";
import { loginTypeDefs } from "./login/typeDefs";
import { rbacTypeDefs } from "./rbac/typeDefs";
import { givingTypes } from "./giving/types";
import { dashboardTypes } from "./dashboard/types";
import { pageTypes } from "./page/types";
import { entityTypes } from "./entity/types";
import { faqTypes } from "./faq/types";
import { feedTypes } from "./feed/types";
import { pollTypes } from "./polls/types";
import { userTypes } from "./user/types";
import { listingTypes } from "./listing/types";
import { discussionTypes } from "./discussion/types";
import { websiteTypes } from "./website/types";
import { customFormTypes } from "./custom-form/types";
import { surveyTypes } from "./survey/types";
import { announcementsTypes } from "./announcements/types";
import { alumniStoriesTypes } from "./alumni-stories/types";
import { gamificationTypes } from "./gamification/types";
import { jobsTypes } from "./jobs/types";
import { settingsTypes } from "./settings/types";
import { mentorShipTypes } from "./mentorship/types";
import { paymentsTypes } from "./payment/types";
import groupsTypes from "./groups/types";
import { eventTypes } from "./events/types";
import { offersTypes } from "./offers/types";
import { moderationTypes } from "./moderation/types";
import { shopTypeDefs } from "./shop/types";
import { currencyTypeDefs } from "./currency/types";
import { rewardsTypes } from "./rewards/types";
import { reportTypes } from "./report/types";
import { momentTypes } from "./moment/types";
import { storageTypes } from "./storage/types";
import { addonPricingTypes } from "./addon-pricing/types";
import { emailCampaignTypes } from "./email-campaigns/types";
import { automationTypes } from "./automation/types";
import { mcpTypes } from "./mcp/types";
import { wallOfFameTypes } from "./wall-of-fame/types";
import { industryTypes } from "./industry/types";

const mainTypeDefs = `#graphql
  # User Types
  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    role: UserRole!
    status: UserStatus!
    region: Region!
    entityId: String
    emailVerified: Boolean!
    phoneNumber: String
    phoneVerified: Boolean!
    lastLoginAt: String
    createdAt: String!
    updatedAt: String!
  }

  # Entity Types
  type Entity {
    id: ID!
    name: String!
    slug: String!
    description: String
    status: EntityStatus!
    region: Region!
    settings: EntitySettings
    createdAt: String!
    updatedAt: String!
  }

  type EntitySettings {
    theme: String
    features: [String!]
  }

  # Audit Log Types
  type AuditLog {
    id: ID!
    adminId: ID!
    entityId: ID!
    module: String!
    action: String!
    resourceId: String
    targetUserId: ID
    previousState: JSON
    newState: JSON
    reason: String
    ipAddress: String
    userAgent: String
    createdAt: Date!
    admin: User
    targetUser: User
  }

  # Authentication
  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
    expiresIn: Int!
  }

  # Enums
  enum UserRole {
    USER
    ADMIN
    ENTITY_ADMIN
    SUPER_ADMIN
  }

  enum UserStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
    PENDING
  }

  enum EntityStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
  }

  enum Region {
    INDIA
    US
    UAE
  }

  # Input Types
  input LoginInput {
    email: String!
    password: String!
  }

  input CreateUserInput {
    email: String!
    username: String!
    password: String!
    firstName: String!
    lastName: String!
    role: UserRole!
    region: Region!
    entityId: String
    phoneNumber: String
  }

  input UpdateUserInput {
    firstName: String
    lastName: String
    role: UserRole
    status: UserStatus
    phoneNumber: String
  }

  input CreateEntityInput {
    name: String!
    slug: String!
    description: String
    region: Region!
  }

  input UpdateEntityInput {
    name: String
    description: String
    status: EntityStatus
  }

  # Pagination
  input PaginationInput {
    page: Int
    limit: Int
  }

  type PaginationMeta {
    currentPage: Int!
    totalPages: Int!
    totalItems: Int!
    itemsPerPage: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type UserConnection {
    data: [User!]!
    meta: PaginationMeta!
  }

  type EntityConnection {
    data: [Entity!]!
    meta: PaginationMeta!
  }

  type AuditLogConnection {
    data: [AuditLog!]!
    meta: PaginationMeta!
  }

  # gRPC Types
  type Country {
    code: String!
    name: String!
  }

  type CountryDetails {
    code: String!
    name: String!
    currency: String!
    taxName: String!
    taxPercentage: Float!
    taxType: String!
    taxIncluded: Boolean!
  }

  type Package {
    packageId: String!
    name: String!
    accessType: String!
    monthlyPrice: Float!
    yearlyPrice: Float!
    adminUsers: Int!
    numberOfUsers: Int!
    numberOfEmailsPerMonth: Int
    isPopular: Boolean!
    benefits: [String!]!
    currency: String!
    modules: [Module!]
  }

  type Module {
    id: ID
    name: String
    icon: String
  }

  type Subscription {
    subscriptionId: String!
    packageId: String!
    planName: String!
    planType: String!
    billingCycle: String!
    price: Float!
    startDate: String!
    endDate: String!
    status: Boolean!
    subscriptionType: String
    graceUntil: String
  }

  type Page {
    id: ID
    name: String
    logo: String
    location: Location
    type: String
    industry: String
    website: String
    pageType: String
    size: String
    tagline: String
    url: String
  }

  type Location {
    name: String
    latitude: Float
    longitude: Float
    address: String
  }

  type PageEntity {
    id: ID
    address: String
    category: String
    name: String
    timeZone: String
    logo: String
    website: String
    domain: EntityDomain
  }

  type EntityDomain {
    domain: String
  }

  scalar Upload
  scalar JSON

  # Queries
  type Query {
    me: User
    users(pagination: PaginationInput, region: Region, status: UserStatus): UserConnection!
    user(id: ID!): User
    entities(pagination: PaginationInput, region: Region): EntityConnection!
    entity(id: ID!): Entity
    auditLogs(pagination: PaginationInput, userId: String, module: String): AuditLogConnection!
    auditLogById(id: ID!): AuditLog
    auditLogModules: [String!]!
    
    # gRPC queries
    countries: [Country!]!
    country: CountryDetails
    packages(country: String!, entityId: String!): [Package!]!
    entitySubscription(entityId: String!): Subscription
    pages(value: String, limit: Int): [Page!]!
    
    health: HealthStatus!
  }

  # Mutations
  type Mutation {
    login(input: LoginInput!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    createEntity(input: CreateEntityInput!): Entity!
    updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
    initializeWebsite(entityId: ID!): Boolean!
  }

  # Health Status
  type HealthStatus {
    status: String!
    database: String!
    redis: String!
  }
`;

export const typeDefs = [
  mainTypeDefs,
  adminTypeDefs,
  entityTypes,
  faqTypes,
  feedTypes,
  pollTypes,
  userTypes,
  listingTypes,
  discussionTypes,
  websiteTypes,
  customFormTypes,
  surveyTypes,
  announcementsTypes,
  alumniStoriesTypes,
  gamificationTypes,
  jobsTypes,
  settingsTypes,
  mentorShipTypes,
  paymentsTypes,
  groupsTypes,
  eventTypes,
  givingTypes,
  pageTypes,
  dashboardTypes,
  offersTypes,
  moderationTypes,
  shopTypeDefs,
  currencyTypeDefs,
  rewardsTypes,
  reportTypes,
  momentTypes,
  storageTypes,
  addonPricingTypes,
  emailCampaignTypes,
  rbacTypeDefs,
  loginTypeDefs,
  automationTypes,
  mcpTypes,
  wallOfFameTypes,
  industryTypes,
];

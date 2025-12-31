export const listingTypes = `#graphql
  enum ListingConditionEnum {
    NEW
    USED_LIKE_NOW
    USED_LIKE_GOOD
    USED_LIKE_FAIR
  }

  enum listingStatus {
    ALL
    APPROVED
    PENDING
    REJECTED
    DISABLED
    PAUSED
  }

  enum LogAction {
    STATUS
    UPDATE
  }
  type listingMedia {
    url: String!
  }
  type MarketPlaceListing {
    id: ID!
    postedBy: User
    addedBy: String
    entityId: ID!
    title: String!
    price: String!
    condition: ListingConditionEnum!
    status: listingStatus!
    sku: String
    slug: String!
    description: String!
    category: String
    isApproved: Boolean!
    isExpired: Boolean!
    createdAt: Date!
    updatedAt: Date!
    tag: [String]
    isFeatured: Boolean!
    numberOfViews: Int!
    interests: [String]
    categories: [String]
    location: JSON! 
    verification: ListingVerification
    media: [MarketPlaceMedia!]!
    currency: String!
  }

  type ListingVerification {
    id: ID!
    isVerifiedAt: String
    verifiedBy: User
    isVerified: Boolean!
    verificationReason: String
    listing: MarketPlaceListing!
  }

  type MarketPlaceMedia {
    id: ID!
    url: String!
    marketPlace: MarketPlaceListing!
    createdAt: String!
    updatedAt: String!
  }

  type ListingLog {
    id: ID!
    listing: MarketPlaceListing!
    status: listingStatus
    performedBy: User!
    reason: String
    previousState: JSON
    newState: JSON
    createdAt: String!
    updatedAt: String!
    entity: Entity!
    action: LogAction!
  }

  type MarketPlaceCategory {
    id: ID!
    name: String!
  }

  # Input types
  input ListingInput {
    title: String!
    price: String!
    condition: ListingConditionEnum!
    description: String!
    category: ID!
    sku: String
    interests: [String]
    categories: [String]
    location: JSON! 
    media: [Upload]
    tag: [String]
  }

  input EditListingInput {
    id: ID!
    title: String!
    price: String!
    condition: ListingConditionEnum!
    description: String!
    category: ID!
    sku: String
    interests: [String]
    categories: [String]
    location: JSON!
    reason: String
  }

  input ChangeListingStatusInput {
    listingId: ID!
    action: String!
    reason: String
  }

  type ListingStats {
    totalListings: String
    listingsDiff: String
    activeListings: String
    activePercent: String
    verifiedListings: String
    verifiedPercent: String
    totalViews: String
    viewsPercent: String
  }
  type ListingStatsById {
    totalViews: String
    uniqueViews: String
    totalContactClicks: String
    contactRate: String
    thisWeekViews: String
    lastWeekViews: String
    weeklyViewsDiff: String
  }
  input ListingStatsByIdInput {
    listingId: ID!
  }
  extend type Query {
    getListing(input: GetListingInput!): [MarketPlaceListing!]!
    getListingDetailsByID(
      input: GetListingDetailsByIDInput!
    ): MarketPlaceListing
    getListingStats: ListingStats
    getListingStatsById(input: ListingStatsByIdInput!): ListingStatsById
  }

  input GetListingInput {
    status: listingStatus
  }

  input GetListingDetailsByIDInput {
    listingId: ID!
  }

  extend type Mutation {
    addListing(input: ListingInput!): MarketPlaceListing!
    editListing(input: EditListingInput!): MarketPlaceListing!
    changeListingStatus(input: ChangeListingStatusInput!): MarketPlaceListing!
    changeListingVerification(
      input: ChangeListingStatusInput!
    ): MarketPlaceListing!
  }
`;

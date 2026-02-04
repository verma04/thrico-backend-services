const gql = String.raw;

export const offersTypes = gql`
  type Offer {
    id: ID!
    title: String!
    description: String
    image: String
    discount: String
    validityStart: Date
    validityEnd: Date
    status: String
    claimsCount: Int!
    viewsCount: Int!
    category: OfferCategory
    location: JSON
    company: JSON
    timeline: JSON
    termsAndConditions: String
    website: String
    isApprovedAt: Date
    addedBy: String
    userId: ID
    isActive: Boolean!
    verification: OfferVerification
    createdAt: Date!
    updatedAt: Date!
  }

  type OfferCategory {
    id: ID!
    name: String!
    color: String
    isActive: Boolean!
    offersCount: Int
    createdAt: Date!
  }

  type OfferVerification {
    id: ID!
    isVerified: Boolean!
    isVerifiedAt: String
    verifiedBy: ID
    verificationReason: String
    offerId: ID!
  }

  type OfferStats {
    totalOffers: Int!
    activeOffers: Int!
    claims: Int!
    views: Int!
    totalOffersChange: Float
    activeOffersChange: Float
    claimsChange: Float
    viewsChange: Float
  }

  input GetOffersInput {
    categoryId: ID
    status: String
    search: String
    pagination: PaginationInput
  }

  input VerifyOfferInput {
    offerId: ID!
    isVerified: Boolean!
    verificationReason: String
  }

  input CreateOfferCategoryInput {
    name: String!
    color: String
    isActive: Boolean
  }

  input UpdateOfferCategoryInput {
    name: String
    color: String
    isActive: Boolean
  }

  input CreateOfferInput {
    title: String!
    description: String
    image: Upload
    discount: String
    categoryId: ID
    validityStart: String
    validityEnd: String
    status: String
    location: JSON
    company: JSON
    timeline: JSON
    termsAndConditions: String
    website: String
    userId: ID
    addedBy: String
  }

  input UpdateOfferInput {
    title: String
    description: String
    image: Upload
    discount: String
    categoryId: ID
    validityStart: String
    validityEnd: String
    status: String
    location: JSON
    company: JSON
    timeline: JSON
    termsAndConditions: String
    website: String
    isActive: Boolean
    isApprovedAt: String
  }

  input ChangeOfferStatusInput {
    id: ID!
    action: String!
    reason: String
  }

  extend type Query {
    getOfferStats(timeRange: TimeRange!): OfferStats!
    getOffers(input: GetOffersInput): [Offer!]!
    getOfferCategories: [OfferCategory!]!
  }

  extend type Mutation {
    createOffer(input: CreateOfferInput!): Offer!
    updateOffer(id: ID!, input: UpdateOfferInput!): Offer!
    deleteOffer(id: ID!): Boolean!
    createOfferCategory(input: CreateOfferCategoryInput!): OfferCategory!
    updateOfferCategory(
      id: ID!
      input: UpdateOfferCategoryInput!
    ): OfferCategory!
    deleteOfferCategory(id: ID!): Boolean!
    verifyOffer(input: VerifyOfferInput!): OfferVerification!
    changeOfferStatus(input: ChangeOfferStatusInput!): Offer!
  }
`;

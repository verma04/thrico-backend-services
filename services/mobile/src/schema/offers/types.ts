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
    sharesCount: Int!
    category: OfferCategory
    location: JSON
    company: JSON
    timeline: JSON
    termsAndConditions: String
    website: String
    isApprovedAt: Date
    addedBy: String
    user: entityUser
    userId: ID
    isActive: Boolean!
    canReport: Boolean!
    canDelete: Boolean!
    canEdit: Boolean!
    isOwner: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  type OfferCategory {
    id: ID!
    name: String!
    color: String
    isActive: Boolean!
    createdAt: Date!
  }

  input CreateOfferInput {
    title: String!
    description: String
    image: Upload
    discount: String
    categoryId: ID
    validityStart: String
    validityEnd: String
    location: JSON
    company: JSON
    timeline: JSON
    termsAndConditions: String
    website: String
  }

  input GetOffersInput {
    categoryId: ID
    cursor: String
    limit: Int
    search: String
  }

  type OfferEdge {
    cursor: String!
    node: Offer!
  }

  type OfferConnection {
    edges: [OfferEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type OfferStats {
    viewsCount: Int!
    claimsCount: Int!
    sharesCount: Int!
  }

  input UpdateOfferInput {
    title: String
    description: String
    image: Upload
    discount: String
    categoryId: ID
    validityStart: String
    validityEnd: String
    location: JSON
    company: JSON
    timeline: JSON
    termsAndConditions: String
    website: String
    isActive: Boolean
  }

  extend type Query {
    getOffers(input: GetOffersInput): OfferConnection!
    getOffersByUserId(input: GetOffersInput): OfferConnection!
    getMyOffers(input: GetOffersInput): OfferConnection!
    getOfferById(offerId: ID!): Offer!
    getOfferCategories: [OfferCategory!]!
    getOfferStats(offerId: ID!): OfferStats!
  }

  extend type Mutation {
    createOffer(input: CreateOfferInput!): Offer!
    editOffer(offerId: ID!, input: UpdateOfferInput!): Offer!
    claimOffer(offerId: ID!): Offer!
    trackOfferVisual(offerId: ID!): Boolean!
    shareOffer(offerId: ID!): Offer!
    deleteOffer(offerId: ID!): Boolean!
  }
`;

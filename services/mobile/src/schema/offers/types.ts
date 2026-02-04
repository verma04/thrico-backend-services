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
    offset: Int!
    limit: Int!
    search: String
  }

  type OffersResponse {
    offers: [Offer!]!
    totalCount: Int!
  }

  extend type Query {
    getOffers(input: GetOffersInput): OffersResponse!
    getOffersByUserId(input: GetOffersInput): OffersResponse!
    getOfferById(offerId: ID!): Offer!
    getOfferCategories: [OfferCategory!]!
  }

  extend type Mutation {
    createOffer(input: CreateOfferInput!): Offer!
    claimOffer(offerId: ID!): Offer!
    trackOfferVisual(offerId: ID!): Boolean!
    shareOffer(offerId: ID!): Offer!
  }
`;

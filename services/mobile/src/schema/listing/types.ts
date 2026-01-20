export const marketPlaceTypes = `#graphql
  scalar Upload

  type media {
    url: String
  }
  type SellerRating {
    averageRating: Float!
    totalRatings: Int!
    ratingDistribution: JSON
  }
  type listing {
    id: ID
    title: String
    description: String
    location: String
    condition: String
    category: String
    price: String
    createdAt: Date
    media: [String]
    currency: String
  }
  input inputAddListing {
    title: String!
    location: String!
    condition: String!
    sku: String
    category: String
    latitude: Float!
    longitude: Float!
    description: String!
    media: [Upload]
    price: Int!
  }
  type marketPlaceList {
    details: listing
    id: ID
    isSold: Boolean
    isFeatured: Boolean
    isWishList: Boolean
    isTrending: Boolean
    user: user
    numberOfViews: Int
    numberOfContactClick: Int
    sellerRating: SellerRating
    isOwner: Boolean
    canDelete: Boolean
    canReport: Boolean
  }

  input inputGetAllListings {
    page: Int
    limit: Int
    search: String
  }

  type paginationInfo {
    currentPage: Int
    totalPages: Int
    totalCount: Int
    limit: Int
    hasNextPage: Boolean
    hasPreviousPage: Boolean
  }

  type marketPlaceListWithPagination {
    listings: [marketPlaceList]
    pagination: paginationInfo
  }
  input PaginationInput {
    page: Int
    limit: Int
  }

  type HasContactedResponse {
    hasContacted: Boolean!
  }
  enum ListingStatus {
    ALL
    ACTIVE
    SOLD
    EXPIRED
    PENDING
  }

  input GetMyListingsInput {
    status: ListingStatus
    page: Int
    limit: Int
    search: String
  }

  type ListingStatusInfo {
    isSold: Boolean!
  }
  type ListingVerification {
    id: ID
    isVerified: Boolean
    verifiedBy: ID
    isVerifiedAt: String
    verificationReason: String
  }

  type ListingDetails {
    details: listing
    id: ID
    isFeatured: Boolean
    isSold: Boolean!
    isTrending: Boolean
    user: user
    numberOfViews: Int
    numberOfContactClick: Int
    sellerRating: SellerRating
    isOwner: Boolean
    canDelete: Boolean
    canReport: Boolean
    verification: ListingVerification
  }
  input GetListingByIdInput {
    identifier: String!
  }

  input GetRelatedListingsInput {
    listingId: ID!
    limit: Int
  }

  input GetUserListingsInput {
    userId: ID!
    page: Int
    limit: Int
  }

  type RelatedListingsResponse {
    listings: [marketPlaceList!]!
  }

  input GetListingEnquiriesInput {
    listingId: ID!
    page: Int
    limit: Int
  }
  type Query {
    getListingDetailsById(input: GetListingByIdInput!): ListingDetails!
    getUserListingEnquiries(input: PaginationInput): EnquiryListResponse!
    getSellerReceivedEnquiries(input: PaginationInput): EnquiryListResponse!
    getListingConversationMessages(
      conversationId: ID!
      input: PaginationInput
    ): ConversationMessagesResponse!
    getAllListing(input: inputGetAllListings): marketPlaceListWithPagination
    getFeaturedListings(
      input: inputGetAllListings
    ): marketPlaceListWithPagination!
    getTrendingListings(
      input: inputGetAllListings
    ): marketPlaceListWithPagination!
    getMyListings(input: GetMyListingsInput): marketPlaceListWithPagination!
    hasContactedSeller(listingId: ID!): HasContactedResponse!
    getListingStatus(listingId: ID!): ListingStatusInfo!
    getRelatedListingsByListingId(
      input: GetRelatedListingsInput!
    ): RelatedListingsResponse!
    getListingsByUserId(
      input: GetUserListingsInput!
    ): marketPlaceListWithPagination!
    getListingEnquiries(input: GetListingEnquiriesInput!): EnquiryListResponse!
    getListingEnquiryStats(listingId: ID!): EnquiryStatistics!
    getListingEnquiriesGroupedByBuyer(listingId: ID!): [BuyerEnquiryGroup!]!
    mapViewAllListings(input: PaginationInput): MapViewListingsWithPagination!
  }
  # Report Types
  input ReportListingInput {
    listingId: ID!
    reason: String!
    description: String
  }

  type ReportResponse {
    success: Boolean!
    reportId: ID!
    message: String!
  }
  type ListingActionResponse {
    success: Boolean!
    message: String!
  }
  input MarkAsSoldInput {
    listingId: ID!
  }
  input DeleteListingInput {
    listingId: ID!
  }

  input SendListingMessageInput {
    conversationId: ID!
    content: String!
  }

  type SendMessageResponse {
    id: ID
    conversationId: ID
    senderId: ID!
    content: String!
    isRead: Boolean!
    readAt: String
    createdAt: Date!
    updatedAt: Date!
  }
  type Mutation {
    addListing(input: inputAddListing): listing
    contactSeller(input: ContactSellerInput!): ContactSellerResponse!
    reportListing(input: ReportListingInput!): ReportResponse!

    markListingAsSold(input: MarkAsSoldInput!): ListingActionResponse!
    deleteListing(input: DeleteListingInput!): ListingActionResponse!

    sendMessage(input: SendListingMessageInput!): SendMessageResponse!
  }
  input ContactSellerInput {
    listingId: ID!
    message: String!
  }

  type ConversationMessage {
    id: ID!
    content: String!
    createdAt: Date!
    isRead: Boolean!
    readAt: String
    sender: EnquiryUser!
    isMine: Boolean!
  }

  type ConversationMessagesResponse {
    messages: [ConversationMessage!]!
    pagination: paginationInfo!
  }

  type EnquiryListing {
    id: ID!
    title: String!
    price: String!
    currency: String!
    media: [String]
  }

  type EnquiryMessage {
    id: ID!
    content: String!
    createdAt: Date!
    isRead: Boolean!
  }

  type EnquiryConversation {
    id: ID!
    lastMessageAt: String
  }

  type ListingEnquiry {
    id: ID!
    createdAt: Date!
    listing: EnquiryListing!
    seller: EnquiryUser
    buyer: EnquiryUser
    message: EnquiryMessage!
    conversation: EnquiryConversation!
  }
  type EnquiryUser {
    id: ID!
    firstName: String!
    lastName: String!
    avatar: String!
  }
  type EnquiryListResponse {
    enquiries: [ListingEnquiry!]!
    pagination: paginationInfo!
  }

  type ContactSellerResponse {
    success: Boolean!
    contactId: ID!
    messageId: ID!
    conversationId: ID!
    message: String!
  }

  type EnquiryStatistics {
    totalEnquiries: Int!
    unreadEnquiries: Int!
    uniqueBuyers: Int!
  }

  type BuyerEnquiryGroup {
    conversationId: ID!
    buyer: EnquiryUser!
    lastMessageAt: Date
    totalMessages: Int!
    unreadMessages: Int!
    lastMessage: ConversationMessage
  }

  type MapViewListing {
    id: ID
    title: String
    price: String
    location: String
    latitude: Float
    longitude: Float
    media: [String]
    isApproved: Boolean
    isExpired: Boolean
    isSold: Boolean
  }

  type MapViewListingsWithPagination {
    listings: [MapViewListing!]!
    pagination: paginationInfo!
  }
`;

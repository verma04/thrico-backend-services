// const { Parking } = require('../models/Parking');
const communitiesTypes = `#graphql
  type CommunityAnalyticsResponse {
    totalMembers: Int
    activeUsers: Int
    postsThisMonth: Int
    eventsCreated: Int
    recentActivity: [String]
  }
  scalar Upload
  scalar Date
  scalar JSON
  type success {
    success: Boolean
  }

  type successMessage {
    success: Boolean
    message: String
  }

  enum IS_MEMBER_ENUM {
    REQUEST_SEND
    MEMBER
    NO_MEMBER
  }
  enum GROUP_STATUS_ENUM {
    PENDING
    APPROVED
    REJECTED
    BLOCKED
  }
  enum GROUP_USER_ENUM {
    not_member
    admin
    user
  }
  type groupDetails {
    id: ID
    status: String
    isFeatured: Boolean
    isWishList: Boolean
    isTrending: Boolean
    group: group
    groupSettings: groupSettings
    groupStatus: GROUP_STATUS_ENUM
    role: String
    rank: String
    trendingScore: Int
    isGroupMember: Boolean
    isJoinRequest: Boolean
    isGroupAdmin: Boolean
    isGroupManager: Boolean
    members: [groupMember]
    creator: groupCreator
    ratingSummary: ratingSummary
  }

  type groupCreator {
    id: ID
    firstName: String
    lastName: String
    avatar: String
  }

  type groupDetailsWithCreator {
    id: ID
    status: IS_MEMBER_ENUM
    isFeatured: Boolean
    isWishList: Boolean
    isTrending: Boolean
    group: group
    groupSettings: groupSettings
    groupStatus: GROUP_STATUS_ENUM
    role: String
    rank: String
    trendingScore: Int
    isGroupMember: Boolean
    isJoinRequest: Boolean
    isGroupAdmin: Boolean
    isGroupManager: Boolean
    groupMember: [groupMember]
    creator: groupCreator
    ratingSummary: ratingSummary
  }
  type groupMember {
    id: ID
    avatar: String
    firstName: String
    lastName: String
    role: String
    joinedAt: Date
  }
  type group {
    title: String
    cover: String
    id: ID
    slug: String
    total: Int
    description: String
    admin: [groupMember]
    privacy: String
    isGroupMember: Boolean
    isJoinRequest: Boolean
    isGroupAdmin: Boolean
    isTrending: Boolean
    numberOfUser: Int
    numberOfLikes: Int
    numberOfPost: Int
    createdAt: Date
    updatedAt: Date
    numberOfViews: Int
    tag: [String]
    isFeatured: Boolean
    location: JSON
    tagline: String
    creator: String
    addedBy: String
    entity: String
    status: String
    isApproved: Boolean
    theme: String
    interests: [String]
    categories: [String]
    communityType: String
    joiningTerms: String
    requireAdminApprovalForPosts: Boolean
    allowMemberInvites: Boolean
    allowMemberPosts: Boolean
    enableEvents: Boolean
    enableRatingsAndReviews: Boolean
    rules: JSON
    overallRating: String
    totalRatings: Int
    verifiedRating: String
    totalVerifiedRatings: Int
  }

  type groupSettings {
    id: ID
    groupId: ID
    groupType: String
    joiningCondition: String
    privacy: String
  }
  type aboutUser {
    currentPosition: String
    headline: String
  }
  type totalMember {
    total: Int
    member: [String]
  }

  type alumni {
    id: ID
    firstName: String
    lastName: String
    memberSince: Date
    role: String
    avatar: String
  }
  input slug {
    slug: String!
  }

  input inputId {
    id: ID!
  }

  type status {
    status: Boolean
  }

  input inputGetCommunities {
    searchTerm: String
    page: Int
    limit: Int
    filters: communityFilters
  }

  input CommunityCursorInput {
    cursor: String
    limit: Int
    searchTerm: String
    filters: communityFilters
  }

  type CommunityEdge {
    cursor: String!
    node: groupDetails!
  }

  type CommunityConnection {
    edges: [CommunityEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input inputGetCommunitiesById {
    searchTerm: String
    page: Int
    limit: Int
    filters: communityFilters
    userId: ID!
  }

  type memberRange {
    min: Int
    max: Int
  }

  input memberRangeInput {
    min: Int
    max: Int
  }

  input communityFilters {
    recommendedFilters: [String]
    communityType: String
    memberRange: memberRangeInput
    privacy: String
    categories: [String]
    interests: [String]
    minRating: Float
    verifiedOnly: Boolean
    location: JSON
  }

  type paginationInfo {
    currentPage: Int
    totalPages: Int
    totalCount: Int
    limit: Int
    hasNextPage: Boolean
    hasPreviousPage: Boolean
  }

  type communitiesWithPagination {
    communities: [groupDetails]
    pagination: paginationInfo
  }

  type communityStats {
    totalMembers: Int
    totalPosts: Int
    totalLikes: Int
    totalViews: Int
  }

  type communityMember {
    id: ID
    fullName: String
    avatar: String
    role: String
    joinedAt: Date
  }

  type communityDetailsResponse {
    id: ID
    group: group
    isAdmin: Boolean
    isManager: Boolean
    isMember: Boolean
    isWishlist: Boolean
    isTrending: Boolean
    role: String
    status: IS_MEMBER_ENUM
    numberOfUsers: Int
    numberOfPosts: Int
    numberOfLikes: Int
    numberOfViews: Int
    topMembers: [communityMember]
    groupSettings: groupSettings
    trendingScore: Int
    ratingSummary: ratingSummary
    isFeatured: Boolean
  }

  type communityFiltersResponse {
    categories: [String]
    interests: [String]
    communityTypes: [String]
    privacyOptions: [String]
    recommendedFilterOptions: [String]
    memberRanges: [memberRange]
  }

  enum RatingValue {
    ONE
    TWO
    THREE
    FOUR
    FIVE
  }

  type communityRating {
    id: ID
    rating: Int
    review: String
    isVerified: Boolean
    verifiedBy: String
    verifiedAt: Date
    helpfulCount: Int
    unhelpfulCount: Int
    createdAt: Date
    updatedAt: Date
    user: user
    currentUserVote: Boolean
  }

  type ratingSummary {
    groupId: ID
    totalRatings: Int
    averageRating: Float
    totalVerifiedRatings: Int
    averageVerifiedRating: Float
    oneStar: Int
    twoStar: Int
    threeStar: Int
    fourStar: Int
    fiveStar: Int
    verifiedOneStar: Int
    verifiedTwoStar: Int
    verifiedThreeStar: Int
    verifiedFourStar: Int
    verifiedFiveStar: Int
    lastUpdated: Date
  }

  type ratingMetadata {
    isCurrentUserAdmin: Boolean
    canAddRating: Boolean
    currentUserRating: communityRating
    summary: ratingSummary
  }

  type CommunityRatingEdge {
    cursor: String!
    node: communityRating!
  }

  type CommunityRatingConnection {
    edges: [CommunityRatingEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    metadata: ratingMetadata
  }

  type ratingsWithPagination {
    ratings: [communityRating]
    pagination: paginationInfo
    metadata: ratingMetadata
  }

  type ratingReport {
    id: ID
    reason: String
    description: String
    status: String
    createdAt: Date
  }

  input updateRatingInput {
    id: ID!
    communityId: ID!
    rating: Int!
    review: String
  }

  input addRatingInput {
    communityId: ID!
    rating: Int!
    review: String
  }

  input getRatingsInput {
    communityId: ID!
    cursor: String
    limit: Int
    sortBy: String
    verifiedOnly: Boolean
  }

  input voteRatingInput {
    ratingId: ID!
    isHelpful: Boolean!
  }

  input verifyRatingInput {
    ratingId: ID!
    isVerified: Boolean!
    reason: String
  }

  input reportRatingInput {
    ratingId: ID!
    reason: String!
    description: String
  }

  input getHighlyRatedCommunitiesInput {
    page: Int
    limit: Int
    minRating: Float
    verifiedOnly: Boolean
  }

  input searchCommunitiesInput {
    searchTerm: String
    page: Int
    limit: Int
    filters: communityFilters
  }

  type member {
    id: ID
  }

  type groupConditions {
    allowMemberPosts: Boolean
    requireAdminApprovalForPosts: Boolean
    allowMemberInvites: Boolean
    enableEvents: Boolean
    enableRatingsAndReviews: Boolean
  }

  type CommunityAboutResponse {
    communityDetails: group
    adminInfo: groupSettings
    rules: JSON
    postRatingSummary: ratingSummary
  }

  # =============== MEMBER MANAGEMENT TYPES ===============

  type communityMemberWithRole {
    id: ID
    userId: ID
    role: String
    joinedAt: Date
    isActive: Boolean
    lastActivityAt: Date
    user: userBasicInfo
    isCurrentUser: Boolean
    canEdit: Boolean
    canRemove: Boolean
  }

  type userBasicInfo {
    id: ID
    firstName: String
    lastName: String
    fullName: String
    avatar: String
    email: String
    phone: String
    lastLogin: Date
    isVerified: Boolean
  }

  type roleStatistics {
    ADMIN: Int
    MANAGER: Int
    MODERATOR: Int
    USER: Int
    total: Int
  }

  type memberPermissions {
    isCurrentUserAdmin: Boolean
    currentUserRole: String
    canInviteMembers: Boolean
    canManageRoles: Boolean
    canRemoveMembers: Boolean
  }

  type membersWithRolesResponse {
    members: [communityMemberWithRole]
    roleStatistics: roleStatistics
    pagination: paginationInfo
    permissions: memberPermissions
  }

  type memberRoleUpdateResponse {
    success: Boolean
    updatedMember: memberRoleUpdate
  }

  type memberRoleUpdate {
    id: ID
    userId: ID
    role: String
    updatedAt: Date
  }

  type memberRemovalResponse {
    success: Boolean
    message: String
  }

  # =============== INVITATION SYSTEM TYPES ===============

  type communityInvitation {
    id: ID
    groupId: ID
    invitedUserId: ID
    invitedBy: ID
    status: String
    message: String
    createdAt: Date
    expiresAt: Date
    respondedAt: Date
    entityId: ID
    inviter: userBasicInfo
    community: group
  }

  type invitationResponse {
    success: Boolean
    message: String
    invitation: communityInvitation
  }

  type invitationActionResponse {
    success: Boolean
    message: String
  }

  # =============== BULK OPERATIONS TYPES ===============

  type bulkOperationResult {
    memberId: ID
    success: Boolean
    result: JSON
    error: String
  }

  type bulkRoleUpdateResponse {
    success: Boolean
    results: [bulkOperationResult]
  }

  type bulkRemovalResponse {
    success: Boolean
    results: [bulkOperationResult]
  }

  # =============== ACTIVITY TRACKING TYPES ===============

  type memberActivityResponse {
    success: Boolean
    message: String
  }

  # =============== INPUT TYPES ===============

  input getCommunityMembersInput {
    groupId: ID!
    page: Int
    limit: Int
    role: String
    searchTerm: String
    sortBy: String
  }

  input updateMemberRoleInput {
    groupId: ID!
    memberId: ID!
    newRole: String!
  }

  input removeMemberInput {
    groupId: ID!
    memberId: ID!
    reason: String
  }

  input leaveCommunityInput {
    groupId: ID!
  }

  input inviteMemberInput {
    groupId: ID!
    userId: ID!
    message: String
  }

  input respondToInvitationInput {
    invitationId: ID!
    accept: Boolean!
  }

  input memberRoleUpdateItem {
    memberId: ID!
    newRole: String!
  }

  input bulkUpdateMemberRolesInput {
    groupId: ID!
    updates: [memberRoleUpdateItem!]!
  }

  input bulkRemoveMembersInput {
    groupId: ID!
    memberIds: [ID!]!
    reason: String
  }

  input updateMemberActivityInput {
    groupId: ID!
  }

  # =============== JOIN REQUEST TYPES ===============

  type pendingJoinRequest {
    id: ID!
    userId: ID!
    notes: String
    requestedAt: Date!
    user: userBasicInfo!
  }

  type JoinRequestEdge {
    cursor: String!
    node: pendingJoinRequest!
  }

  type JoinRequestConnection {
    edges: [JoinRequestEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type pendingJoinRequestsResponse {
    requests: [pendingJoinRequest!]!
    pagination: paginationInfo!
  }

  type joinRequestActionResponse {
    success: Boolean!
    action: String!
    request: processedJoinRequest!
  }

  type processedJoinRequest {
    id: ID!
    userId: ID!
    user: userBasicInfo!
    status: String!
  }

  type pendingJoinRequestsCountResponse {
    count: Int!
    groupId: ID!
  }

  input getPendingJoinRequestsCountInput {
    id: ID!
  }

  # =============== ENUMS ===============

  enum JoinRequestAction {
    ACCEPT
    REJECT
  }

  input getPendingJoinRequestsInput {
    id: ID!
    cursor: String
    limit: Int
  }
  input respondToJoinRequestInput {
    groupId: ID!
    requestId: ID!
    action: JoinRequestAction!
    reason: String
  }

  input CommunityFeedCursorInput {
    cursor: String
    limit: Int
    id: ID!
  }

  input getMyJoinedCommunitiesFeedInput {
    cursor: String
    limit: Int
  }

  input inputGroupFeedPagination {
    offset: Int!
    limit: Int!
    id: ID!
  }

  type paginationFeed {
    total: Int
    limit: Int
    offset: Int
    hasMore: Boolean
  }

  type CommunityFeedEdge {
    cursor: String!
    node: feed!
  }

  type CommunityFeedConnection {
    edges: [CommunityFeedEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type communitiesFeed {
    feeds: [feed]
    pagination: paginationFeed
  }

  type communityFeedStats {
    totalFeeds: Int!
    pinnedFeeds: Int!
    pendingFeeds: Int!
    approvedFeeds: Int!
    rejectedFeeds: Int!
    flaggedFeeds: Int!
    reportedFeeds: Int!
    recentFeeds: Int
    criticallyReportedFeeds: Int
    feedsByType: JSON
    feedsByPriority: JSON
  }

  enum CommunityReportReasonEnum {
    INAPPROPRIATE_CONTENT
    SPAM
    HARASSMENT
    FAKE_COMMUNITY
    VIOLENCE
    HATE_SPEECH
    SCAM_FRAUD
    COPYRIGHT_VIOLATION
    MISINFORMATION
    OTHER
  }
  type CommunityReportReason {
    value: String!
    label: String!
  }

  input ReportCommunityInput {
    communityId: ID!
    reason: CommunityReportReasonEnum!
    description: String
    evidenceUrls: [String]
  }
  # =============== INPUT TYPES ===============
  enum SortOrder {
    ASC
    DESC
  }
  type CommunityMemberPublicProfile {
    id: ID!
    userId: ID!
    firstName: String!
    lastName: String!
    fullName: String!
    avatar: String
    role: String!
    stats: CommunityMemberStats!
    isOnline: Boolean!
    canViewPrivateStats: Boolean!
    joinedAt: Date!
  }
  input GetCommunityMemberStatsInput {
    memberId: ID!
    communityId: ID!
  }
  enum MemberStatsSortBy {
    ENGAGEMENT_SCORE
    TOTAL_POSTS
    JOINED_AT
    LAST_ACTIVE
    TOTAL_LIKES
    TOTAL_COMMENTS
    RANK
  }

  input GetCommunityMembersWithStatsInput {
    communityId: ID!
    page: Int
    limit: Int
    sortBy: MemberStatsSortBy
    sortOrder: SortOrder
    role: String
    searchTerm: String
  }

  input GetCommunityLeaderboardInput {
    communityId: ID!
    period: LeaderboardPeriod
    category: LeaderboardCategory
    limit: Int
  }
  # =============== MEMBER STATS TYPES ===============

  type CommunityMemberStats {
    totalPosts: Int!
    approvedPosts: Int!
    pendingPosts: Int!
    rejectedPosts: Int!
    pinnedPosts: Int!
    reportedPosts: Int!
    totalLikes: Int!
    totalComments: Int!
    totalShares: Int!
    totalViews: Int!
    joinedAt: Date!
    lastActive: Date
    membershipDuration: Int!
    rank: Int!
    badges: [String!]!
    postsByType: JSON!
    engagementScore: Float!
  }
  type CommunityMemberStatsResponse {
    memberId: ID!
    communityId: ID!
    stats: CommunityMemberStats!
    canViewPrivateStats: Boolean!
    role: String!
  }
  type CommunityMembersWithStatsResponse {
    members: [CommunityMemberPublicProfile!]!
    pagination: paginationInfo!
  }

  # =============== LEADERBOARD TYPES ===============

  type LeaderboardEntry {
    userId: ID!
    role: String!
    score: Float!
    rank: Int!
    user: userBasicInfo!
    badges: [String!]!
    stats: CommunityMemberStats
  }
  enum LeaderboardPeriod {
    WEEK
    MONTH
    QUARTER
    YEAR
    ALL
  }

  enum LeaderboardCategory {
    OVERALL
    POSTS
    ENGAGEMENT
    LIKES
    COMMENTS
    SHARES
    VIEWS
  }

  type CommunityLeaderboardResponse {
    communityId: ID!
    period: LeaderboardPeriod!
    category: LeaderboardCategory!
    leaderboard: [LeaderboardEntry!]!
    viewerRank: Int
    totalParticipants: Int!
  }
  # =============== UPDATED QUERY AND MUTATION TYPES ===============

  type Query {
     getCommunityReportReasons: [CommunityReportReason!]!
    getCommunityAnalytics(input: inputId): CommunityAnalyticsResponse
    getCommunitiesModeType: [String]
    getCommunitiesPrivacyEnum: [String]
    getAllCommunities(input: CommunityCursorInput): CommunityConnection!
    getCommunitiesCreatedByMe: [groupDetails]

    # Community Query Types
    getFeaturedCommunities(input: CommunityCursorInput): CommunityConnection!
    getTrendingCommunities(input: CommunityCursorInput): CommunityConnection!

    getCommunitiesByUserId(input: CommunityCursorInput): CommunityConnection!
    getMyOwnedCommunities(input: CommunityCursorInput): CommunityConnection!
    getMyJoinedCommunities(input: CommunityCursorInput): CommunityConnection!
    getSavedCommunities(input: CommunityCursorInput): CommunityConnection!

    getAllCommunitiesDetails(input: inputId): group
    getCommunitiesMember(input: inputId): totalMember
    getCommunityTermAndConditions: String
    getAboutCommunities(input: inputId): groupDetails
    getCommunityConditions(input: inputId): groupConditions

    # New community API methods
    getCommunityStats(input: inputId): communityStats
    searchCommunities(input: CommunityCursorInput): CommunityConnection!
    getCommunityFilters: communityFiltersResponse
    getRecommendedCommunities(input: CommunityCursorInput): CommunityConnection!
    getRecentlyViewedCommunities(input: CommunityCursorInput): CommunityConnection!
    getHighlyRatedCommunities(
      input: getHighlyRatedCommunitiesInput
    ): communitiesWithPagination
    getCommunityDetails(input: inputId!): groupDetails

    # New: Full community about query
    getCommunityAboutById(input: inputId): CommunityAboutResponse

    # Rating system queries
    getCommunityRatings(input: getRatingsInput): CommunityRatingConnection!
    getCommunityRatingSummary(input: inputId): ratingSummary

    # Media system queries
    getCommunityMedia(
      input: getCommunityMediaInput
    ): communityMediaWithPagination
    getGroupJoinRequests(input: inputId): [GroupJoinRequest]
    trackCommunityView(input: inputId): Boolean
    getCommunityMembersWithRoles(
      input: getCommunityMembersInput
    ): membersWithRolesResponse
    getCommunityInvitations(input: inputId): [communityInvitation]
    getPendingInvitations: [communityInvitation]
    getPendingJoinRequests(
      input: getPendingJoinRequestsInput!
    ): JoinRequestConnection!
    getPendingJoinRequestsCount(
      input: getPendingJoinRequestsCountInput!
    ): pendingJoinRequestsCountResponse

    getCommunitiesFeedList(input: CommunityFeedCursorInput): CommunityFeedConnection!
    getPendingFeedCommunities(input: CommunityFeedCursorInput): CommunityFeedConnection!
    getAllPinnedFeeds(input: CommunityFeedCursorInput): CommunityFeedConnection!
    getAllFlaggedFeeds(input: CommunityFeedCursorInput): CommunityFeedConnection!
    getMyJoinedCommunitiesFeed(input: getMyJoinedCommunitiesFeedInput): CommunityFeedConnection!

    getCommunityFeedStats(input: inputId): communityFeedStats!
    # Community reporting queries
    getCommunityReportReasons: [CommunityReportReason!]!

    getCommunityMemberStats(
      input: GetCommunityMemberStatsInput!
    ): CommunityMemberStatsResponse!
    getCommunityMembersWithStats(
      input: GetCommunityMembersWithStatsInput!
    ): CommunityMembersWithStatsResponse!

    # Leaderboard queries
    getCommunityLeaderboard(
      input: GetCommunityLeaderboardInput!
    ): CommunityLeaderboardResponse!
  }
  type reactions {
    type: String
    user: alumni
    feedId: ID
  }

  enum privacy {
    PRIVATE
    PUBLIC
  }
  enum joiningConditions {
    ANYONE_CAN_JOIN
    ADMIN_ONLY_ADD
  }

  input addGroup {
    title: String!
    privacy: String!
    communityType: String!
    cover: Upload
    description: String
    joiningTerms: String!
    categories: [String]
    interests: [String]
    location: JSON
    tagline: String
    allowMemberInvites: Boolean
    enableEvents: Boolean
    enableRatingsAndReviews: Boolean
    requireAdminApprovalForPosts: Boolean
  }

  input editGroup {
    id: ID!
    title: String
    privacy: String
    communityType: String
    cover: Upload
    description: String
    joiningTerms: String
    categories: [String]
    interests: [String]
    location: JSON
    tagline: String
    allowMemberInvites: Boolean
    enableEvents: Boolean
    enableRatingsAndReviews: Boolean
    requireAdminApprovalForPosts: Boolean
  }

  input inputJoinCommunity {
    id: ID!
    reason: String!
  }

  # Community Media System Types
  type communityMedia {
    id: ID
    imageUrl: String
    title: String
    description: String
    displayOrder: Int
    isActive: Boolean
    createdAt: Date
    updatedAt: Date
    uploader: user
  }

  type communityMediaWithPagination {
    media: [communityMedia]
    pagination: paginationInfo
  }

  input addCommunityMediaInput {
    groupId: ID!
    imageUrl: String!
    title: String!
    description: String
  }

  input updateCommunityMediaInput {
    mediaId: ID!
    title: String
    description: String
    displayOrder: Int
  }

  input reorderMediaInput {
    groupId: ID!
    mediaOrder: [MediaOrderItem!]!
  }

  input MediaOrderItem {
    mediaId: ID!
    displayOrder: Int!
  }

  input getCommunityMediaInput {
    groupId: ID!
    page: Int
    limit: Int
    includeInactive: Boolean
  }

  type responseId {
    id: ID
  }

  input withdrawJoinRequestInput {
    groupId: ID!
  }

  input pinCommunityFeedInput {
    communityId: ID!
    feedId: ID!
  }

  input approveCommunityFeedInput {
    communityId: ID!
    feedId: ID!
  }
  type WithdrawJoinRequestResponse {
    success: Boolean!
    message: String!
  }
  type CommunityReportResponse {
    success: Boolean!
    reportId: ID
    totalReports: Int
    isFlagged: Boolean
    message: String
  }

  type LeaveCommunityResponse {
    success: Boolean!
    message: String!
    communityArchived: Boolean!
  }

input inputDeleteCommunityRating {
  id: ID!
  communityId: ID!

}
  type Mutation {
    joinCommunity(input: inputJoinCommunity): groupDetails
    createCommunities(input: addGroup): groupDetails
    editCommunity(input: editGroup): groupDetails
    wishListCommunity(input: inputId): status
    deleteCommunityFeed(input: inputId): feed
    deleteFeedCommunities(input: inputId): successMessage
    pinCommunityFeed(input: pinCommunityFeedInput): successMessage
    unpinCommunityFeed(input: pinCommunityFeedInput): successMessage
    approveCommunityFeed(input: approveCommunityFeedInput): successMessage

    # New community mutations
    toggleCommunityWishlist(input: inputId): groupDetails

    # Rating system mutations
    addCommunityRating(input: addRatingInput): communityRating
    updateCommunityRating(input: updateRatingInput): communityRating
    deleteCommunityRating(input: inputDeleteCommunityRating!): status
    voteRatingHelpfulness(input: voteRatingInput): status
    verifyRating(input: verifyRatingInput): status
    reportRating(input: reportRatingInput): ratingReport

    # Media system mutations
    addCommunityMedia(input: addCommunityMediaInput): communityMedia
    updateCommunityMedia(input: updateCommunityMediaInput): communityMedia
    deleteCommunityMedia(input: inputId): status
    reorderCommunityMedia(input: reorderMediaInput): status

    updateMemberRole(input: updateMemberRoleInput): memberRoleUpdateResponse
    removeMemberFromCommunity(input: removeMemberInput): memberRemovalResponse
    leaveCommunity(input: leaveCommunityInput): LeaveCommunityResponse

    # Invitation system mutations
    inviteMemberToCommunity(input: inviteMemberInput): invitationResponse
    respondToInvitation(
      input: respondToInvitationInput
    ): invitationActionResponse
    cancelInvitation(input: inputId): invitationActionResponse

    # Bulk operations mutations
    bulkUpdateMemberRoles(
      input: bulkUpdateMemberRolesInput
    ): bulkRoleUpdateResponse
    bulkRemoveMembers(input: bulkRemoveMembersInput): bulkRemovalResponse

    # Activity tracking mutations
    updateMemberActivity(
      input: updateMemberActivityInput
    ): memberActivityResponse

    respondToJoinRequest(
      input: respondToJoinRequestInput!
    ): joinRequestActionResponse
    # Community reporting mutations
    reportCommunity(input: ReportCommunityInput!): CommunityReportResponse!
    withdrawJoinRequest(
      input: withdrawJoinRequestInput!
    ): WithdrawJoinRequestResponse
  }

  type GroupJoinRequest {
    id: ID!
    userId: ID!
    groupId: ID!
    createdAt: Date!
    updatedAt: Date!
    isAccepted: Boolean!
    memberStatusEnum: String!
    notes: String
  }
`;

export { communitiesTypes };

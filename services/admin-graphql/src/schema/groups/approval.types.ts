const gql = String.raw;

// const { Parking } = require('../models/Parking')
const approvalTypes = gql`
  enum CommunityForumStatus {
    ALL
    APPROVED
    PENDING
    REJECTED
    DISABLED
    PAUSED
  }

  type Group {
    id: String
    slug: String
    title: String
    creator: String
    entity: String
    cover: String
    isApproved: Boolean
    about: String
    createdAt: Date
    updatedAt: Date
    setting: GroupSetting
    theme: GroupTheme
    interest: GroupInterest
    status: CommunityEntityStatus
  }

  type GroupTheme {
    id: ID
    title: String
  }

  type GroupInterest {
    id: ID
    title: String
  }
  type GroupSetting {
    groupType: String
    joiningCondition: String
    privacy: String
  }
  type GroupRequest {
    id: ID
    user: User
    notes: String
    createdAt: Date
  }

  input InputGetCommunityRequest {
    groupId: ID!
  }

  type Query {
    getCommunityRequest(input: InputGetCommunityRequest!): [GroupRequest]
    getCommunities(input: InputGetCommunities!): [CommunityEntity]
    getCommunityById(input: GetCommunityByIdInput!): CommunityEntity
  }

  input AddInterests {
    title: String!
  }
  input DeleteInterests {
    id: ID!
  }
  input DuplicateInterests {
    id: ID!
  }
  input EditInterests {
    id: ID!
    title: String!
  }
  input InputFeaturedGroup {
    id: ID!
  }

  enum CommunityEntityStatus {
    APPROVED
    BLOCKED
    PENDING
    REJECTED
    PAUSED
    DISABLED
    # Add other statuses you support
  }

  type CommunityEntity {
    id: ID!
    slug: String
    title: String
    addedBy: String
    cover: String!
    status: CommunityEntityStatus!
    isApproved: Boolean
    description: String
    createdAt: Date
    updatedAt: Date
    isFeatured: Boolean
    theme: ID
    interests: [String]
    categories: [String]
    numberOfUser: Int
    numberOfLikes: Int
    numberOfPost: Int
    numberOfViews: Int
    tag: [String]
    location: JSON
    requireAdminApprovalForPosts: Boolean!
    allowMemberInvites: Boolean
    enableEvents: Boolean
    enableRatingsAndReviews: Boolean
    communityType: String
    joiningTerms: String
    privacy: String
    allowMemberPosts: Boolean
    rules: String
    verification: CommunityVerification
    tagline: String
  }

  type CommunityVerification {
    id: ID
    isVerifiedAt: Date
    verifiedBy: User
    isVerified: Boolean
    verificationReason: String
  }

  input CommunityEntityInput {
    title: String
    cover: Upload
    description: String
    interests: [String]
    categories: [String]
    tag: [String]
    location: JSON
    requireAdminApprovalForPosts: Boolean
    allowMemberInvites: Boolean
    enableEvents: Boolean
    enableRatingsAndReviews: Boolean
    communityType: String!
    joiningTerms: String!
    privacy: String!
    enableRating: Boolean
    tagline: String
    theme: ID
  }

  input InputGetCommunities {
    status: CommunityForumStatus
  }

  input UpdateCommunityRuleInput {
    communityId: ID!
    rules: String!
  }

  input UpdateCommunityPermissionsInput {
    communityId: ID!
    allowMemberPosts: Boolean
    requireAdminApprovalForPosts: Boolean
    allowMemberInvites: Boolean
    enableEvents: Boolean
    enableRatingsAndReviews: Boolean
  }
  input UpdateBasicInfoInput {
    communityId: ID!
    title: String
    description: String
    cover: Upload
    privacy: String
    communityType: String
    joiningTerms: String
  }
  input GetCommunityByIdInput {
    communityId: ID!
  }

  enum VerificationAction {
    VERIFY
    UNVERIFY
  }
  enum CommunityStatusAction {
    APPROVE
    REJECT
    DISABLE
    ENABLE
    PAUSE
    REAPPROVE
  }
  input ChangeDiscussionCommunityVerificationInput {
    communityId: ID!
    action: VerificationAction!
    reason: String
  }

  input ChangeDiscussionCommunityStatusInput {
    communityId: ID!
    action: CommunityStatusAction!
    reason: String
  }
  type Mutation {
    addCommunity(input: CommunityEntityInput): CommunityEntity
    addFeaturedGroup(input: [String]): Group

    updateBasicInfo(input: UpdateBasicInfoInput!): CommunityEntity
    updateCommunityPermissions(
      input: UpdateCommunityPermissionsInput!
    ): CommunityEntity
    updateCommunityRules(input: UpdateCommunityRuleInput!): CommunityEntity

    changeDiscussionCommunityStatus(
      input: ChangeDiscussionCommunityStatusInput!
    ): CommunityEntity
    changeDiscussionCommunityVerification(
      input: ChangeDiscussionCommunityVerificationInput!
    ): CommunityEntity
  }
`;

export { approvalTypes };

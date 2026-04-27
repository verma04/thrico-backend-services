const mentorShipTypes = `#graphql
  scalar Upload
  scalar Date
  type category {
    id: ID
    title: String
    createdAt: Date
    updatedAt: Date
  }
  type skills {
    id: ID
    title: String
    createdAt: Date
    updatedAt: Date
  }
  type aboutUserDetails {
    currentPosition: String
  }
  type alumniDetails {
    avatar: String
    lastName: String
    firstName: String
    aboutUser: aboutUserDetails
  }
  type userDetails {
    user: alumniDetails
  }
  type mentor {
    id: ID
    isApproved: Boolean
    isRequested: Boolean
    displayName: String
    slug: String
    about: String
    description: String

    featuredArticle: String
    greatestAchievement: String
    intro: String
    introVideo: String
    whyDoWantBecomeMentor: String
    agreement: Boolean
    mentorUser: userDetails
    category: category
    isFeatured: Boolean
    isTopMentor: Boolean
    skills: [String]
    mentorSince: Date
    createdAt: Date
    updatedAt: Date
  }
  input PaginationInput {
    limit: Int
    offset: Int
  }
  type MentorshipStats {
    totalMentors: Int
    approvedMentors: Int
    pendingMentors: Int
    rejectedMentors: Int
    totalCategories: Int
  }
  type Query {
    getAllMentor(input: getAllMentorInput): [mentor]
    mentorshipRequests(input: PaginationInput): [mentor]
    getMentorCategories: [category]
     getMentorSkills: [skills]
    getAllPendingMentorships(input: PaginationInput): [mentor]
    getMentorshipStats: MentorshipStats
    getMentorById(id: ID!): mentor
    mentorshipAuditLogs(pagination: PaginationInput): AuditLogConnection
  }
  input inputMentorShipCategory {
    title: String!
  }
  input inputMentorShipSkills {
    title: String!
  }

  input inputMentorShipSkillsId {
    id: ID!
  }
  input updateMentorShipSkillsInput {
    id: ID!
    title: String!
  }
  input inputMentorShipCategoryId {
    id: ID!
  }
  input updateMentorShipCategoryInput {
    id: ID!
    title: String!
  }
  enum LocationType {
    APPROVE
    REJECT
    BLOCK
  }
  enum MentorStatus {
    APPROVED
    BLOCKED
    PENDING
    REJECTED
  }
  input mentorShipActionsInput {
    action: LocationType!
    mentorshipID: ID!
  }
  input updateMentorshipStatusInput {
    mentorshipId: ID!
    status: MentorStatus!
  }
  input featureMentorInput {
    mentorshipId: ID!
    isFeatured: Boolean!
  }
  input markTopMentorInput {
    mentorshipId: ID!
    isTopMentor: Boolean!
  }
  input removeMentorInput {
    mentorshipId: ID!
  }
  input getAllMentorInput {
    status: String
    limit: Int
    offset: Int
    searchQuery: String
    category: ID
    isTopMentor: Boolean
    isFeatured: Boolean
  }
  input DirectAddMentorInput {
    userId: ID!
    displayName: String!
    category: ID
    skills: [String]
    intro: String!
    about: String!
    description: String
    featuredArticle: String
    introVideo: String
    whyDoWantBecomeMentor: String
    greatestAchievement: String!
    agreement: Boolean
    isTopMentor: Boolean
  }
  input UpdateMentorInput {
    id: ID!
    displayName: String
    category: ID
    skills: [String]
    intro: String
    about: String
    featuredArticle: String
    introVideo: String
    whyDoWantBecomeMentor: String
    greatestAchievement: String
    isFeatured: Boolean
    isTopMentor: Boolean
  }
  type Mutation {
    addMentor(input: DirectAddMentorInput): mentor
    addMentorShipCategory(input: inputMentorShipCategory): [category]
    updateMentorShipCategory(input: updateMentorShipCategoryInput): category
    deleteMentorShipCategory(input: inputMentorShipCategoryId): category
    duplicateMentorShipCategory(input: inputMentorShipCategoryId): [category]
    mentorShipActions(input: mentorShipActionsInput): [mentor]
    updateMentorshipStatus(input: updateMentorshipStatusInput): mentor
    featureMentor(input: featureMentorInput): mentor
    markTopMentor(input: markTopMentorInput): mentor
    removeMentor(input: removeMentorInput): mentor
    updateMentor(input: UpdateMentorInput): mentor

    addMentorShipSkills(input: inputMentorShipSkills): [skills]
    updateMentorShipSkills(input: updateMentorShipSkillsInput): skills
    deleteMentorShipSkills(input: inputMentorShipSkillsId): skills
    duplicateMentorShipSkills(input: inputMentorShipSkillsId): [skills]
  }
`;

export { mentorShipTypes };

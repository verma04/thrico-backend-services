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

    featuredArticle: String
    greatestAchievement: String
    intro: String
    introVideo: String
    whyDoWantBecomeMentor: String
    agreement: Boolean
    user: userDetails
    category: category
    isFeatured: Boolean
    createdAt: Date
    updatedAt: Date
  }
  input PaginationInput {
    limit: Int
    offset: Int
  }
  type Query {
    getAllMentor(input: allStatusInput): [mentor]
   getMentorCategories: [category]
   getMentorSkills: [skills]
    getAllPendingMentorships(input: PaginationInput): [mentor]
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
  type Mutation {
    addMentorShipCategory(input: inputMentorShipCategory): [category]
    updateMentorShipCategory(input: updateMentorShipCategoryInput): category
    deleteMentorShipCategory(input: inputMentorShipCategoryId): category
    duplicateMentorShipCategory(input: inputMentorShipCategoryId): [category]
    mentorShipActions(input: mentorShipActionsInput): [mentor]
    updateMentorshipStatus(input: updateMentorshipStatusInput): mentor
    featureMentor(input: featureMentorInput): mentor

    addMentorShipSkills(input: inputMentorShipSkills): [skills]
    updateMentorShipSkills(input: updateMentorShipSkillsInput): skills
    deleteMentorShipSkills(input: inputMentorShipSkillsId): skills
    duplicateMentorShipSkills(input: inputMentorShipSkillsId): [skills]
  }
`;

export { mentorShipTypes };

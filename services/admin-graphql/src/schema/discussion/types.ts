export const discussionTypes = `#graphql
  enum discussionForumStatus {
    ALL
    APPROVED
    PENDING
    REJECTED
    DISABLED
  }

  enum categoryType {
    ALL
    ACTIVE
    INACTIVE
  }
  enum voteType {
    UPVOTE
    DOWNVOTE
  }
  type discussionForumCategory {
    id: ID
    name: String
    description: String
    isActive: Boolean
    createdAt: Date
    updatedAt: Date
    slug: String
  }
  type discussionForumComment {
    id: ID
    content: String
    createdAt: Date
    updatedAt: Date
    slug: String
    commentedBy: addedByType
    user: FeedUser
    discussionForumId: String
  }
  type discussionForum {
    id: ID
    title: String
    content: String
    category: discussionForumCategory
    upVotes: String
    downVotes: String
    totalComments: Int
    status: discussionForumStatus
    approvedReason: String
    isAnonymous: Boolean
    addedBy: addedByType
    user: FeedUser
    verification: verification
    createdAt: Date
    updatedAt: Date
    isLikeByYou: Boolean
    voteType: voteType
  }
  input inputDiscussionForum {
    title: String
    content: String
    isAnonymous: Boolean
    category: ID
  }

  input inputDiscussionForumCategory {
    name: String
    description: String
    isActive: Boolean
  }
  input editDiscussionForumCategory {
    id: ID!
    name: String
    description: String
    isActive: Boolean
  }
  input editChangeStatusDiscussionForumCategory {
    id: ID!
    isActive: Boolean!
  }
  input inputPostDiscussionForumComment {
    content: String!
    discussionForumId: ID!
  }
  input inputDeleteDiscussionForumComment {
    commentId: String!
    discussionForumId: ID!
    reason: String
  }
  type message {
    message: String
  }

  input deleteDiscussionForumComment {
    commentId: String!
    discussionForumId: ID!
  }
  input inputUpVoteDiscussionForum {
    discussionForumId: ID!
    upVote: Boolean!
  }
  input inoutChangeDiscussionForumVerification {
    action: String
    reason: String
    discussionForumId: ID
  }
  input inputDownVoteDiscussionForum {
    discussionForumId: ID!
    downVote: Boolean!
  }
  input inputChangeDiscussionForumStatus {
    action: String
    reason: String
    discussionForumId: ID
  }
  input inputEditDiscussionForum {
    title: String
    content: String
    isAnonymous: Boolean
    category: ID
    id: ID
    reason: String
  }
  
  # Input filters
  input inputGetDiscussionForumDetailsByID {
    discussionForumId: ID!
  }
  input inputGetDiscussionForumCategory {
    status: categoryType
  }
  input inputGetDiscussionForum {
    status: discussionForumStatus
  }
  
  # Resolvers Extension
  extend type Query {
    getDiscussionForumCategory(
      input: inputGetDiscussionForumCategory
    ): [discussionForumCategory]
    getDiscussionForum(input: inputGetDiscussionForum): [discussionForum]
    getDiscussionForumComments(input: inputId): [discussionForumComment]
    getDiscussionForumDetailsByID(
      input: inputGetDiscussionForumDetailsByID
    ): discussionForum
  }
  
  extend type Mutation {
    addDiscussionForumCategory(
      input: inputDiscussionForumCategory
    ): discussionForumCategory
    editDiscussionForumCategory(
      input: editDiscussionForumCategory
    ): discussionForumCategory
    changeStatusDiscussionForumCategory(
      input: editChangeStatusDiscussionForumCategory
    ): discussionForumCategory

    changeDiscussionForumVerification(
      input: inoutChangeDiscussionForumVerification
    ): discussionForum
    addDiscussionForum(input: inputDiscussionForum): discussionForum
    postDiscussionForumComments(
      input: inputPostDiscussionForumComment
    ): discussionForumComment
    deleteDiscussionForumComments(
      input: inputDeleteDiscussionForumComment
    ): message
    upVoteDiscussionForum(input: inputUpVoteDiscussionForum): message
    downVoteDiscussionForum(input: inputDownVoteDiscussionForum): message
    changeDiscussionForumStatus(
      input: inputChangeDiscussionForumStatus
    ): discussionForum
    editDiscussionForum(input: inputEditDiscussionForum): discussionForum
  }
`;

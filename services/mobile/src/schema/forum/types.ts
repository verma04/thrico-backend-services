export const forumTypes = `#graphql
  enum discussionForumStatus {
    TRENDING
    HOT
    NEW
    MY_POST
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
    slug: Date
  }
  type discussionForumComment {
    id: ID
    content: String
    createdAt: Date
    updatedAt: Date
    slug: Date
    commentedBy: addedByType
    user: user
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
    status: String
    isAnonymous: Boolean
    addedBy: addedByType
    user: user
    createdAt: Date
    updatedAt: Date
    isLikeByYou: Boolean
    voteType: voteType
    isOwner: Boolean
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

  input inputDownVoteDiscussionForum {
    discussionForumId: ID!
    downVote: Boolean!
  }

  input inputEditDiscussionForum {
    title: String
    content: String
    isAnonymous: Boolean
    category: ID
    id: ID
  }
  input inputDeleteForum {
    forumId: ID
  }
  type Mutation {
    addDiscussionForum(input: inputDiscussionForum): discussionForum
    postDiscussionForumComments(
      input: inputPostDiscussionForumComment
    ): discussionForumComment
    deleteDiscussionForumComments(
      input: inputDeleteDiscussionForumComment
    ): discussionForumComment
    upVoteDiscussionForum(input: inputUpVoteDiscussionForum): message
    downVoteDiscussionForum(input: inputDownVoteDiscussionForum): message

    editDiscussionForum(input: inputEditDiscussionForum): discussionForum
    deleteForum(input: inputDeleteForum): discussionForum
  }
  input inputGetDiscussionForumDetailsByID {
    discussionForumId: ID!
  }

  input inputGetDiscussionForum {
    status: discussionForumStatus
  }
  type Query {
    getDiscussionForumCategory: [discussionForumCategory]
    getDiscussionForum(input: inputGetDiscussionForum): [discussionForum]
    getDiscussionForumComments(input: inputId): [discussionForumComment]
    getDiscussionForumDetailsByID(
      input: inputGetDiscussionForumDetailsByID
    ): discussionForum
    discussionPostedByMe: [discussionForum]
  }
`;

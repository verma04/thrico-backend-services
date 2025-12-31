export const feedTypes = `#graphql
  enum feedPrivacy {
    PUBLIC
    CONNECTIONS
  }
  enum addedByType {
    ENTITY
    USER
  }
  
  type FeedUserAbout {
    currentPosition: String
  }

  type FeedUser {
    id: ID
    firstName: String
    avatar: String
    lastName: String
    about: FeedUserAbout
    isOnline: Boolean
    cover: String
  }
  
  type Feed {
    isLiked: Boolean
    id: String
    description: String
    user: FeedUser
    createdAt: Date
    totalComment: Int
    totalReactions: Int
    totalReShare: Int
    isWishList: Boolean
    isOwner: Boolean
    source: String
    media: JSON
    # group: Group
    privacy: feedPrivacy
    addedBy: addedByType
    poll: polls
  }

  input InputAddFeed {
    description: String!
    media: [Upload]
  }
  
  input InputId {
    id: ID!
  }

  input PaginationInput {
    offset: Int
    limit: Int
  }
  
  input InputComment {
    comment: String!
    feedID: ID!
  }
  
  input InputDeleteFeedComment {
    commentId: ID!
  }

  type Status {
    status: Boolean
  }
  
  type Comment {
    id: ID
    content: String
    createdAt: Date
    user: FeedUser
    addedBy: addedByType!
    feedId: ID
  }

  extend type Query {
    getAllFeed(input: PaginationInput): [Feed]
    numberOfFeeds: Int
    getFeedComment(input: InputId): [Comment]
  }

  extend type Mutation {
    likeFeed(input: InputId): Status
    addFeed(input: InputAddFeed): Feed
    addComment(input: InputComment): Comment
    deleteCommentFeed(input: InputDeleteFeedComment): Comment
  }
`;

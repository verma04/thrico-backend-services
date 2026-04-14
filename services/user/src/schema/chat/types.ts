export const chatTypes = `#graphql
  scalar Upload

  enum ChatTypeEnum {
    CONNECTION
    MARKETPLACE
    MENTORSHIP
    ALL
  }

  input chatID {
    userID: ID
    chatType: ChatTypeEnum
  }
  input inputSendMessage {
    chatId: ID!
    content: String!
  }

  input inputChat {
    userID: ID
  }

  input MessagesInput {
    id: ID!
    first: Int
    after: String
  }

  type chat {
    id: ID
    chatType: ChatTypeEnum
  }
  type senderDetails {
    firstName: String
    avatar: String
    lastName: String
  }
  type sender {
    id: ID
    user: senderDetails
  }
  type inbox {
    id: ID
    chatId: ID
    sender: sender
    message: messages
  }

  type messages {
    id: ID
    content: String
    sender: sender
    messageType: String
    senderType: String
    createdAt: Date
  }

  type MessageEdge {
    cursor: String!
    node: messages!
  }

  type MessagesPageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type MessagesConnection {
    edges: [MessageEdge!]!
    pageInfo: MessagesPageInfo!
  }

  type InboxEdge {
    cursor: String!
    node: inbox!
  }

  type InboxPageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type InboxConnection {
    edges: [InboxEdge!]!
    pageInfo: InboxPageInfo!
  }

  type SearchConnectionResult {
    id: ID!
    userId: ID!
    firstName: String
    lastName: String
    avatar: String
  }

  extend type Query {
    getAllMessages(input: MessagesInput!): MessagesConnection
    getInbox(first: Int, after: String, category: ChatTypeEnum): InboxConnection
    searchConnections(search: String!, first: Int): [SearchConnectionResult!]!
  }
  extend type Mutation {
    sendMessageInChat(input: inputSendMessage): messages
    startChat(input: chatID): chat
  }
  extend type Subscription {
    message(id: ID!): messages
  }
`;

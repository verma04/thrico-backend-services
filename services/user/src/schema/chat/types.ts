export const chatTypes = `#graphql
  scalar Upload

  input chatID {
    userID: ID
  }
  input inputSendMessage {
    chatId: ID!
    content: String!
  }

  input inputChat {
    userID: ID
  }

  input messageID {
    id: ID
  }

  type chat {
    id: ID
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
    sender: sender
    message: messages
  }

  type messages {
    id: ID
    content: String
    sender: sender
    messageType: String
    createdAt: Date
  }
  extend type Query {
    getAllMessages(input: messageID): [messages]
    getInbox: [inbox]
  }
  extend type Mutation {
    sendMessageInChat(input: inputSendMessage): [chat]
    startChat(input: chatID): chat
  }
  extend type Subscription {
    message(id: ID!): messages
  }
`;

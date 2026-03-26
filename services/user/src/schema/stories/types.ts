export const storiesTypes = `#graphql
  scalar Upload
  scalar JSON
  scalar Date

  type storiesCategory {
    id: ID
    title: String
    count: Int
  }

  type stories {
    id: ID
    image: String
    textOverlays: JSON
    caption: String
    createdAt: Date
  }

  type ConnectionStories {
    user: user
    stories: [stories!]!
  }

  input inputUserStoryPostedByUser {
    category: ID
    description: String!
    subTitle: String!
    title: String!
    url: String
    cover: Upload
  }

  input inputGetStoriesFromConnections {
    cursor: String
    limit: Int
  }

  type ConnectionStoriesEdge {
    cursor: String!
    node: ConnectionStories!
  }

  type ConnectionStoriesConnection {
    edges: [ConnectionStoriesEdge!]!
    pageInfo: PageInfo!
  }

  input inputUserStoryByID {
    description: String!
    subTitle: String!
    title: String!
    url: String
    cover: Upload
  }

  input inputAddStory {
    image: Upload!
    textOverlays: JSON
    caption: String
  }

  type Mutation {
    addStory(input: inputAddStory): stories
    deleteStory(input: inputId): stories
  }

  type Query {
    getStoriesFromConnections(input: inputGetStoriesFromConnections): ConnectionStoriesConnection!
    getMyStories: [stories!]!
  }
`;

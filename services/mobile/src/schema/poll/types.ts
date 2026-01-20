export const pollTypes = `#graphql
  type polls {
    id: ID
    title: String!
    question: String!
    resultVisibility: resultVisibility!
    options: [options]
    updatedAt: Date
    createdAt: Date
    endDate: Date
    status: pollsStatus
    totalVotes: Int
    isVoted: Boolean
    votedOptionId: ID
    user: user
  }

  enum resultVisibility {
    ALWAYS
    AFTER_VOTE
    AFTER_END
    ADMIN
  }
  enum pollsStatus {
    DISABLED
    APPROVED
  }

  enum by {
    ENTITY
    ALL
    USER
  }
  enum pollAction {
    ENABLE
    DISABLE
  }

  type options {
    id: ID
    text: String
    order: Int
    votes: Int
  }
  input inputGetPollByIdForUser {
    pollId: String
  }

  type Query {
    getPollByIdForUser(input: inputGetPollByIdForUser!): polls
    getAllPolls(input: inputGetAllPolls): [polls]
  }

  input inputGetAllPolls {
    offset: Int
    limit: Int
  }

  input inputVoteOnPoll {
    pollId: String!
    optionId: String!
  }
  type Mutation {
    voteOnPoll(input: inputVoteOnPoll): polls
  }
`;

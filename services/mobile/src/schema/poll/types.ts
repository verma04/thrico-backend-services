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
    isOwner: Boolean
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

  input inputGetAllPolls {
    offset: Int
    limit: Int
  }

  input inputVoteOnPoll {
    pollId: String!
    optionId: String!
  }

  type PollVoter {
    id: ID
    user: user
    votedOption: options
    votedAt: Date
  }

  type Pagination {
    nextCursor: String
    hasNextPage: Boolean
  }

  type PollVotersResponse {
    data: [PollVoter]
    pagination: Pagination
  }

  input inputGetPollVoters {
    pollId: String!
    cursor: String
    limit: Int
  }

  type Query {
    getPollByIdForUser(input: inputGetPollByIdForUser!): polls
    getAllPolls(input: inputGetAllPolls): [polls]
    getPollVoters(input: inputGetPollVoters!): PollVotersResponse
  }

  type Mutation {
    voteOnPoll(input: inputVoteOnPoll): polls
  }
`;

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
  }
  type result {
    pollOptions: options
    votedBy: addedByType
    createdAt: Date
    user: FeedUser
  }

  type deletePolls {
    id: ID
    deleted: Boolean
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

  input inputAddPolls {
    title: String!
    question: String!
    resultVisibility: resultVisibility!
    options: [inputOptions!]!
    endDate: Date
  }
  input inputEditOptions {
    id: ID
    option: String
  }
  input inputEditPolls {
    id: ID!
    title: String!
    question: String!
    resultVisibility: resultVisibility!
    options: [inputEditOptions!]!
    endDate: Date
    reason: String
  }
  input inputOptions {
    option: String
  }
  enum by {
    ENTITY
    ALL
    USER
    ADMIN
  }
  enum pollAction {
    ENABLE
    DISABLE
  }
  input inputGetPolls {
    by: by
  }

  input inputDeletePoll {
    pollId: String
    reason: String
  }
  input inputChangePollStatus {
    pollId: String
    action: pollAction
    reason: String
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
  type pollResult {
    options: [options]
    individualVotes: [result]
  }
  extend type Query {
    getPolls(input: inputGetPolls!): [polls]
    getPollByIdForUser(input: inputGetPollByIdForUser!): polls
    getPollResult(input: inputGetPollByIdForUser!): pollResult
  }
  input inputVoteOnPoll {
    pollId: String!
    optionId: String!
  }
  extend type Mutation {
    deletePoll(input: inputDeletePoll): deletePolls
    addPoll(input: inputAddPolls): polls
    editPoll(input: inputEditPolls): polls
    changePollStatus(input: inputChangePollStatus): polls
    resetVote(input: inputGetPollByIdForUser): polls
    voteOnPoll(input: inputVoteOnPoll): polls
  }
`;

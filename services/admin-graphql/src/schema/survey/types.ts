export const surveyTypes = `#graphql
  enum SurveyStatus {
    DRAFT
    ACTIVE
    COMPLETED
    ARCHIVED
  }

  type Survey {
    id: ID!
    formId: ID!
    title: String!
    description: String
    status: SurveyStatus!
    startDate: Date
    endDate: Date
    createdAt: Date
    updatedAt: Date
    form: CustomForm
    sharedAsFeed: Boolean
    responses: [CustomFormResponse!]!
  }

  input AddSurveyInput {
    title: String!
    startDate: Date
    endDate: Date
  }

  input EditSurveyInput {
    title: String
    description: String
    status: SurveyStatus
    startDate: Date
    endDate: Date
  }

  input GetSurveysInput {
    limit: Int
    offset: Int
    search: String
    status: SurveyStatus
  }

  type GetSurveysResponse {
    surveys: [Survey!]!
    pagination: Pagination
  }

  type Pagination {
     totalCount: Int
     limit: Int
     offset: Int
  }

  input GetSurveyResponsesInput {
    limit: Int
    offset: Int
  }

  type GetSurveyResponsesResponse {
    responses: [CustomFormResponse!]!
    pagination: Pagination
  }

  type SurveyResults {
    surveyId: ID!
    totalResponses: Int!
    questionResults: [SurveyQuestionResult!]!
  }

  type SurveyQuestionResult {
    questionId: ID!
    question: String!
    type: String!
    totalAnswers: Int!
    answers: JSON
    choices: [SurveyChoiceResult!]
  }

  type SurveyChoiceResult {
    label: String!
    count: Int!
    percentage: Float!
  }

  enum TimeRange {
    LAST_24_HOURS
    LAST_7_DAYS
    LAST_30_DAYS
    LAST_90_DAYS
  }

  type SurveyStats {
    totalSurveys: Int!
    activeSurveys: Int!
    totalResponses: Int!
    completionRate: Float!
    totalSurveysChange: Float!
    activeSurveysChange: Float!
    totalResponsesChange: Float!
    completionRateChange: Float!
    responseTrend: [SurveyResponseTrend!]!
    statusDistribution: [SurveyStatusDistribution!]!
  }

  type SurveyResponseTrend {
    date: String!
    count: Int!
    
  }

  type SurveyStatusDistribution {
    status: SurveyStatus!
    count: Int!
  }

  type SurveyTemplate {
    id: ID!
    title: String!
    description: String
    questions: [SurveyTemplateQuestion!]!
  }

  type SurveyTemplateQuestion {
    question: String!
    type: CustomFormFieldType!
    required: Boolean
    scale: Int
    ratingType: RatingType
    options: JSON
    labels: JSON
  }

  extend type Query {
    getSurveys(input: GetSurveysInput): GetSurveysResponse!
    getSurvey(id: ID!): Survey
    getSurveyResponses(surveyId: ID!, input: GetSurveyResponsesInput): GetSurveyResponsesResponse!
    getSurveyResults(surveyId: ID!): SurveyResults!
    getSurveyStats(timeRange: TimeRange!): SurveyStats!
    getSurveyTemplates: [SurveyTemplate!]!
  }

  extend type Mutation {
    addSurvey(input: AddSurveyInput!): Survey
    editSurvey(id: ID!, input: EditSurveyInput!): Survey
    deleteSurvey(id: ID!): idResponse
    publishSurvey(id: ID!): Survey
    draftSurvey(id: ID!): Survey
    createSurveyFromTemplate(templateId: String!): Survey!
    shareSurveyAsFeed(surveyId: ID!, shouldShare: Boolean!, description: String): Survey
  }
`;

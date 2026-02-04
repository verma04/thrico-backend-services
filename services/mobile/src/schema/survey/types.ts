const gql = String.raw;

export const surveyTypes = gql`
  enum SurveyStatus {
    DRAFT
    ACTIVE
    COMPLETED
    ARCHIVED
  }

  enum FormStatus {
    DRAFT
    ACTIVE
    ARCHIVED
  }

  enum QuestionType {
    SHORT_TEXT
    LONG_TEXT
    EMAIL
    PHONE
    WEBSITE
    NUMBER
    OPINION_SCALE
    RATING
    MULTIPLE_CHOICE
    DROPDOWN
    ISOPTION
    DATE
    TIME
    YES_NO
    LEGAL
  }

  type FormAppearance {
    primaryColor: String
    secondaryColor: String
    backgroundColor: String
    textColor: String
    buttonColor: String
    borderRadius: Int
    borderWidth: Int
    borderStyle: String
    borderColor: String
    inputBackground: String
    inputBorderColor: String
    fontSize: Int
    fontWeight: String
    boxShadow: String
    hoverEffect: String
  }

  type Question {
    id: ID!
    formId: ID!
    type: QuestionType!
    question: String!
    description: String
    order: Int!
    required: Boolean!
    maxLength: Int
    min: Int
    max: Int
    scale: Int
    ratingType: String
    options: [String]
    labels: JSON
    allowMultiple: Boolean
    legalText: String
    createdAt: Date!
    updatedAt: Date!
  }

  type CustomForm {
    id: ID!
    entityId: ID!
    userId: ID!
    addedBy: String!
    title: String!
    description: String
    endDate: Date
    previewType: String
    status: FormStatus!
    appearance: JSON
    questions: [Question!]
    createdAt: Date!
    updatedAt: Date!
  }

  type FormResponse {
    id: ID!
    formId: ID!
    surveyId: ID
    answers: JSON!
    respondentId: ID
    isSubmitted: Boolean
    submittedAt: Date!
  }

  type Survey {
    id: ID!
    entityId: ID!
    formId: ID!
    title: String!
    description: String
    status: SurveyStatus!
    startDate: Date
    endDate: Date
    form: CustomForm
    userResponse: FormResponse
    isSubmitted: Boolean
    createdAt: Date!
    updatedAt: Date!
  }

  input GetSurveysInput {
    limit: Int
    offset: Int
    search: String
    status: SurveyStatus
  }

  type SurveyPagination {
    totalCount: Int!
    limit: Int!
    offset: Int!
  }

  type SurveysResponse {
    surveys: [Survey!]!
    pagination: SurveyPagination!
  }

  input SubmitSurveyInput {
    surveyId: ID!
    answers: JSON!
  }

  input SaveSurveyResponseInput {
    responseId: ID!
    answers: JSON!
  }

  extend type Query {
    getSurveys(input: GetSurveysInput): SurveysResponse!
    getSurveyById(id: ID!): Survey
  }

  extend type Mutation {
    submitSurvey(input: SubmitSurveyInput!): FormResponse!
    startSurvey(surveyId: ID!): FormResponse!
    saveSurveyResponse(input: SaveSurveyResponseInput!): FormResponse!
  }
`;

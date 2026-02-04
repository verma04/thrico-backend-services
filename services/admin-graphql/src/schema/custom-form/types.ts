export const customFormTypes = `#graphql
  enum CustomFormStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  enum CustomFormPreviewType {
    MULTI_STEP
    SCROLL_LONG
  }

  enum RatingType {
    star
    heart
    thumb
  }

  enum CustomFormFieldType {
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

  type CustomForm {
    id: ID!
    createdAt: Date
    updatedAt: Date
    status: CustomFormStatus!
    title: String!
    endDate: Date
    description: String
    addedBy: String
    userId: ID
    previewType: CustomFormPreviewType!
    appearance: JSON!
    questions: [CustomFormQuestion!]!
    surveys: [Survey!]!
  }

  type CustomFormQuestion {
    id: ID!
    formId: ID!
    type: CustomFormFieldType!
    question: String!
    description: String
    order: Int!
    required: Boolean
    maxLength: Int
    min: Int
    max: Int
    scale: Int
    ratingType: RatingType
    options: JSON
    labels: JSON
    allowMultiple: Boolean
    legalText: String
  }

  type CustomFormResponse {
    id: ID!
    formId: ID!
    surveyId: ID
    answers: JSON!
    respondentId: ID
    respondent: User
    submittedAt: Date
  }

  input InputCustomForm {
    title: String!
    description: String
    endDate: Date
    previewType: CustomFormPreviewType
    status: CustomFormStatus
    appearance: JSON!
    questions: [InputCustomFormQuestion!]!
  }

  input InputCustomFormQuestion {
    id: ID
    type: CustomFormFieldType!
    question: String!
    description: String
    order: Int
    required: Boolean
    maxLength: Int
    min: Int
    max: Int
    scale: Int
    ratingType: RatingType
    options: JSON
    labels: JSON
    allowMultiple: Boolean
    legalText: String
  }

  input AddQuestionInput {
    formId: ID!
    type: CustomFormFieldType!
    question: String!
    description: String
    order: Int
    required: Boolean
    maxLength: Int
    min: Int
    max: Int
    scale: Int
    ratingType: RatingType
    options: JSON
    labels: JSON
    allowMultiple: Boolean
    legalText: String
  }

  input EditQuestionInput {
    type: CustomFormFieldType
    question: String
    description: String
    order: Int
    required: Boolean
    maxLength: Int
    min: Int
    max: Int
    scale: Int
    ratingType: RatingType
    options: JSON
    labels: JSON
    allowMultiple: Boolean
    legalText: String
  }

  input ReorderQuestionInput {
    id: ID!
    order: Int!
  }

  input inputGetCustomForm {
    by: String
  }

  extend type Query {
    getCustomForms(input: inputGetCustomForm): [CustomForm!]!
    getCustomForm(id: ID!): CustomForm
  }

  extend type Mutation {
    addCustomForm(input: InputCustomForm!): CustomForm
    editCustomForm(id: ID!, input: InputCustomForm!): CustomForm
    deleteCustomForm(id: ID!): idResponse

    # Question Management (Auto-save support)
    addQuestion(input: AddQuestionInput!): CustomFormQuestion
    editQuestion(id: ID!, input: EditQuestionInput!): CustomFormQuestion
    deleteQuestion(id: ID!): idResponse
    editQuestion(id: ID!, input: EditQuestionInput!): CustomFormQuestion
    deleteQuestion(id: ID!): idResponse
    reorderQuestions(input: [ReorderQuestionInput!]!): [CustomFormQuestion!]!
    updateFormSettings(id: ID!, input: UpdateFormSettingsInput!): CustomForm
  }

  input UpdateFormSettingsInput {
    previewType: CustomFormPreviewType
    appearance: JSON
  }
  type idResponse {
    id: ID
    deleted: Boolean
  }
`;

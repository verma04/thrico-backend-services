export const customFormTypes = `#graphql
  enum CustomFormStatus {
    APPROVED
    DISABLED
  }

  # enum CustomFormResultVisibilityType {
  #   ALWAYS
  #   AFTER_SUBMIT
  #   AFTER_END
  #   ADMIN
  # }

  enum CustomFormPreviewType {
    MULTI_STEP
    SCROLL_LONG
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
    IS_OPTION
    DROPDOWN
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
    description: String!
    addedBy: String
    userId: ID
    previewType: CustomFormPreviewType!
    appearance: JSON
    fields: [CustomFormField!]!
  }

  type CustomFormField {
    id: ID!
    formId: ID!
    question: String!
    type: CustomFormFieldType!
    order: Int
    options: JSON
    required: Boolean!
    maxLength: Int
    scale: Int
    ratingType: String
    min: Int
    max: Int
    labels: JSON
    allowMultiple: Boolean
    fieldName: String
    defaultValue: String
    allowedTypes: JSON
    maxSize: Int
  }

  type CustomFormSubmission {
    id: ID!
    formId: ID
    userId: ID
    responses: JSON!
    createdAt: Date
  }

  type CustomFormAuditLog {
    id: ID!
    formId: ID!
    status: String
    performedBy: ID!
    reason: String
    previousState: JSON
    newState: JSON
    createdAt: Date
    entity: ID!
    updatedAt: Date
  }

  input InputCustomForm {
    title: String!
    description: String!

    endDate: Date
    previewType: CustomFormPreviewType
    appearance: JSON
    fields: [InputCustomFormField!]!
  }

  input InputCustomFormField {
    question: String!
    type: CustomFormFieldType!

    options: JSON
    required: Boolean
    maxLength: Int
    scale: Int
    ratingType: String
    min: Int
    max: Int
    id: ID
    labels: JSON
    allowMultiple: Boolean
    fieldName: String
    defaultValue: String
    allowedTypes: JSON
    maxSize: Int
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
  }
  
  type idResponse {
    id: ID
    deleted: Boolean
  }
`;

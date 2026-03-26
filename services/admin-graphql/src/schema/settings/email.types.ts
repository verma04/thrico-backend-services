const emailTypes = `#graphql

  # ─────────────────────────────────────────────
  # Enums
  # ─────────────────────────────────────────────

  enum EmailDomainStatus {
    pending
    verified
    failed
  }

  enum EmailSubscriptionPlan {
    free
    pro
    enterprise
  }

  enum EmailSubscriptionStatus {
    active
    inactive
    expired
  }

  # ─────────────────────────────────────────────
  # Domain Types
  # ─────────────────────────────────────────────

  type DKIMRecord {
    name: String!
    value: String!
  }

  type EmailDomainDNS {
    txtRecord: String
    txtValue: String
    dkimRecords: [DKIMRecord]
    spfRecord: String
  }

  type EmailDomain {
    id: ID!
    entity: String!
    domain: String!
    verificationToken: String
    dkimTokens: String
    spfRecord: String
    status: EmailDomainStatus!
    dnsRecords: EmailDomainDNS
    verifiedAt: String
    createdAt: String
    updatedAt: String
  }

  type EmailDomainVerificationResult {
    domain: String!
    status: String!
    verified: Boolean!
  }

  # ─────────────────────────────────────────────
  # Template Types
  # ─────────────────────────────────────────────

  type EmailTemplate {
    id: ID!
    entity: String!
    name: String!
    subject: String!
    html: String!
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }

  # ─────────────────────────────────────────────
  # Usage Types
  # ─────────────────────────────────────────────

  type EmailUsage {
    id: ID!
    entity: String!
    emailsSent: Int!
    numberOfEmailsPerMonth: Int!
    periodStart: String
    periodEnd: String
    usagePercent: Int
    remaining: Int
  }

  # ─────────────────────────────────────────────
  # Subscription Types
  # ─────────────────────────────────────────────

  type EmailSubscriptionType {
    id: ID!
    entity: String!
    plan: EmailSubscriptionPlan!
    numberOfEmailsPerMonth: Int!
    status: EmailSubscriptionStatus!
    startDate: String
    endDate: String
    createdAt: String
  }

  # ─────────────────────────────────────────────
  # Top-up Types
  # ─────────────────────────────────────────────

  type EmailTopup {
    id: ID!
    entity: String!
    extraEmails: Int!
    purchasedAt: String
  }

  # ─────────────────────────────────────────────
  # Email Log
  # ─────────────────────────────────────────────

  type EmailLogEntry {
    id: ID!
    entity: String!
    to: String!
    subject: String!
    senderAddress: String!
    sesMessageId: String
    status: String
    sentAt: String
  }

  # ─────────────────────────────────────────────
  # Send Email Result
  # ─────────────────────────────────────────────

  type SendEmailResult {
    success: Boolean!
    messageId: String
    message: String
  }

  # ─────────────────────────────────────────────
  # Email Overview (dashboard)
  # ─────────────────────────────────────────────

  type EmailOverview {
    domain: EmailDomain
    subscription: EmailSubscriptionType
    usage: EmailUsage
    recentEmails: [EmailLogEntry]
  }

  # ─────────────────────────────────────────────
  # Inputs
  # ─────────────────────────────────────────────

  input AddEmailDomainInput {
    domain: String!
  }

  input CreateEmailTemplateInput {
    name: String!
    subject: String!
    html: String!
  }

  input UpdateEmailTemplateInput {
    id: ID!
    name: String
    subject: String
    html: String
    isActive: Boolean
  }

  input SendEmailInput {
    to: String!
    subject: String!
    html: String!
    templateId: ID
  }

  input SetEmailSubscriptionInput {
    plan: EmailSubscriptionPlan!
  }

  input AddEmailTopupInput {
    extraEmails: Int!
  }

  input EmailLogFilterInput {
    limit: Int
    offset: Int
  }

  # ─────────────────────────────────────────────
  # Queries
  # ─────────────────────────────────────────────

  type Query {
    getEmailDomain: EmailDomain
    verifyEmailDomain: EmailDomainVerificationResult
    getEmailTemplates: [EmailTemplate]
    getEmailTemplate(id: ID!): EmailTemplate
    getEmailUsage: EmailUsage
    getEmailSubscription: EmailSubscriptionType
    getEmailLogs(input: EmailLogFilterInput): [EmailLogEntry]
    getEmailOverview: EmailOverview
  }

  # ─────────────────────────────────────────────
  # Mutations
  # ─────────────────────────────────────────────

  type Mutation {
    addEmailDomain(input: AddEmailDomainInput!): EmailDomain!
    deleteEmailDomain(id: ID!): success!
    checkEmailDomainVerification: EmailDomainVerificationResult!
    sendEmail(input: SendEmailInput!): SendEmailResult!
    createEmailTemplate(input: CreateEmailTemplateInput!): EmailTemplate!
    updateEmailTemplate(input: UpdateEmailTemplateInput!): EmailTemplate!
    deleteEmailTemplate(id: ID!): success!
    setEmailSubscription(input: SetEmailSubscriptionInput!): EmailSubscriptionType!
    addEmailTopup(input: AddEmailTopupInput!): EmailTopup!
  }
`;

export { emailTypes };

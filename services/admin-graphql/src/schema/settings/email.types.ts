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
    verified: Boolean
  }

  type EmailDomainDNS {
    txtRecord: String
    txtValue: String
    txtVerified: Boolean
    dkimRecords: [DKIMRecord]
    spfRecord: String
    spfVerified: Boolean
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
    createdAt: Date
    updatedAt: Date
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
    slug: String
    subject: String!
    html: String!
    json: String
    isActive: Boolean
    isDeletable: Boolean
    createdAt: Date
    updatedAt: Date
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
    createdAt: Date
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

  type EmailTopupPricing {
    topupId: String!
    countryCode: String!
    name: String!
    numberOfEmails: Int!
    price: Float!
    status: Boolean!
    order: Int!
  }

  type BuyEmailTopupResult {
    success: Boolean!
    message: String!
    billingId: String!
    razorpayOrderId: String!
    amount: Float!
    taxAmount: Float!
    totalAmount: Float!
    currency: String!
    taxName: String
    taxPercentage: Float
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
    sentAt: Date
  }

  type BillingHistoryItem {
    billingId: String!
    planName: String!
    amount: Float!
    taxAmount: Float!
    totalAmount: Float!
    currency: String!
    status: String!
    createdAt: String!
    type: String!
  }

  # ─────────────────────────────────────────────
  # Delivery Performance
  # ─────────────────────────────────────────────

  type DeliveryPerformancePoint {
    day: String!
    sent: Int!
    delivered: Int!
  }

  type EmailUserGroup {
    name: String!
    emails: [String!]!
    count: Int!
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
    billingHistory: [BillingHistoryItem]
  }

  # ─────────────────────────────────────────────
  # Inputs
  # ─────────────────────────────────────────────

  input AddEmailDomainInput {
    domain: String!
  }

  input CreateEmailTemplateInput {
    name: String!
    slug: String
    subject: String!
    html: String!
    json: String
    
  }

  input UpdateEmailTemplateInput {
    id: ID!
    name: String
    subject: String
    html: String
    json: String
    isActive: Boolean
 
  }

  input SendEmailInput {
    to: [String!]!
    subject: String
    html: String
    templateId: ID
  }

  input SetEmailSubscriptionInput {
    plan: EmailSubscriptionPlan!
  }

  input AddEmailTopupInput {
    extraEmails: Int!
  }

  input BuyEmailTopupInput {
    topupId: String!
  }

  input VerifyEmailTopupPaymentInput {
    topupId: String!
    razorpayOrderId: String!
    razorpayPaymentId: String!
    razorpaySignature: String!
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
    getEmailTopups: [EmailTopupPricing]!
    getEmailTopupHistory: [EmailTopup]!
    getEmailUserGroups: [EmailUserGroup!]!
    getEmailDeliveryPerformance: [DeliveryPerformancePoint!]!
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
    buyEmailTopup(input: BuyEmailTopupInput!): BuyEmailTopupResult!
    verifyEmailTopupPayment(input: VerifyEmailTopupPaymentInput!): SendEmailResult!
  }
`;

export { emailTypes };

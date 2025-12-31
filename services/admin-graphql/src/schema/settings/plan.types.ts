const planTypes = `#graphql
  enum BillingCycle {
    monthly
    yearly
  }

  type UsageLimit {
    used: Int!
    limit: Int!
    percent: Int!
  }

  type StringUsageLimit {
    used: String!
    limit: String!
    percent: Int!
  }

  type package {
    name: String
    accessType: String
    monthlyPrice: Float
    yearlyPrice: Float
    adminUsers: Int
    numberOfUsers: Int
    isPopular: Boolean
    benefits: [String]
    packageId: ID!
    currency: String
    modules: [NameIcon]
  }

  # Array of object with name and icon
  type NameIcon {
    name: String!
    icon: String!
  }

  # Example usage in a type (add where needed)
  # type SomeType {
  #   items: [NameIcon!]
  # }

  input UpdateTrialToPackageInput {
    packageId: ID!
    billingCycle: BillingCycle!
  }

  type Order {
    id: ID!
    entity: String!
    amount: Int!
    currency: String!
    receipt: String!
    status: String!
    created_at: String!
  }

  type ProrationDetails {
    oldpackageId: String
    oldPlanName: String
    oldPlanProratedCost: Float
    newpackageId: String
    newPlanName: String
    newPlanProratedCost: Float
    creditApplied: Float
    chargeAmount: Float
  }
  type Invoice {
    billingId: String
    subscriptionId: String
    entityId: String
    packageId: String
    planName: String
    billingCycle: String
    amount: Float
    taxAmount: Float
    totalAmount: Float
    notes: String
    currency: String
    status: String
    prorationDetails: ProrationDetails
    invoiceUrl: String
    createdAt: String
    updatedAt: String
    paidAt: String
  }

  input RazorpayPaymentInput {
    razorpayOrderId: String!
    razorpayPaymentId: String!
    razorpaySignature: String!
  }

  type Query {
    checkUserPlan: Boolean
    getCountryPackage: [package]
    getPlanOverview: PlanOverview
    getAllEntityInvoice: [Invoice]
  }

  type PlanOverview {
    planName: String!
    status: String!
    billingCycle: String!
    nextPaymentDate: String!
    price: Float!
    adminUsers: UsageLimit!
    modulesUsed: UsageLimit!
    userUsage: StringUsageLimit!
    subscriptionType: String!
    package: package
  }

  # Nested Input Types
  input TeamRequirementsInput {
    teamSize: String
    currentSolution: String
    painPoints: [String!]
  }

  input FeaturesInput {
    features: [String!]
  }

  input TimeLineInput {
    budget: String
    timeline: String
    decisionMakers: String
  }

  input ContactInput {
    firstName: String
    lastName: String
    email: String
    phone: String
    jobTitle: String
    contactMethod: String
  }

  input SecurityInput {
    technicalRequirements: String
    additionalInfo: String
    referral: String
  }

  # Main Input
  input CreateCustomRequestInput {
    teamRequirements: TeamRequirementsInput
    features: FeaturesInput
    timeLine: TimeLineInput
    contact: ContactInput
    security: SecurityInput
  }

  # Return Type
  type CustomRequest {
    id: ID!
    teamRequirements: TeamRequirements
    features: Features
    timeLine: TimeLine
    contact: Contact
    security: Security
    createdAt: String
  }

  # Nested Return Types
  type TeamRequirements {
    teamSize: String
    currentSolution: String
    painPoints: [String!]
  }

  type Features {
    features: [String!]
  }

  type TimeLine {
    budget: String
    timeline: String
    decisionMakers: String
  }

  type Contact {
    firstName: String
    lastName: String
    email: String
    phone: String
    jobTitle: String
    contactMethod: String
  }

  type Security {
    technicalRequirements: String
    additionalInfo: String
    referral: String
  }

  input UpgradePlanSummaryInput {
    packageId: ID!
  }

  type UpgradePlanSummary {
    monthlyPrice: Float
    yearlyPrice: Float
    creditApplied: Float
    monthsCovered: Int
    upgradeSummaryText: String
    yearlyNextBillingDate: Date
    monthlyBillingDate: Date
    finalMonthlyPrice: Float
    finalYearlyPrice: Float
    creditAppliedMonthly: Float
    creditAppliedYearly: Float
  }

  input UpdateToYearlyInput {
    packageId: ID!
  }
  input UpgradePlanInput {
    packageId: ID!
    billingCycle: String! # e.g., "monthly", "yearly"
  }
  type Mutation {
    getUpgradePlanSummary(input: UpgradePlanSummaryInput!): UpgradePlanSummary!
    updateTrialToPackage(input: UpdateTrialToPackageInput!): Order!
    verifyRazorpayPayment(input: RazorpayPaymentInput!): subscription!
    createCustomRequest(input: CreateCustomRequestInput!): CustomRequest!
    updateToYearly(input: UpdateToYearlyInput!): Order!
    upgradePlan(input: UpgradePlanInput!): Order!
  }
  type success {
    success: Boolean
    message: String
  }
  type subscription {
      subscriptionId: String
      packageId: String
      planName: String
      planType: String
      billingCycle: String
      price: Float
      startDate: String
      endDate: String
      status: Boolean
      subscriptionType: String
      graceUntil: String
  }
`;

export { planTypes };

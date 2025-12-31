export const jobsTypes = `#graphql
  scalar Upload
  scalar DateTime

  enum jobStatus {
    ALL
    APPROVED
    PENDING
    REJECTED
    DISABLED
    PAUSED
  }

  input GetJobInput {
    status: jobStatus
  }

  type getJobStats {
    totalJobs: Int
    activeJobs: Int
    totalApplications: Int
    totalViews: Int
    avgApplications: Float
    applicationsThisWeek: Int
    applicationsLastWeek: Int
    applicationsWeeklyChange: Float
    viewsThisWeek: Int
    viewsLastWeek: Int
    viewsWeeklyChange: Float
  }

  extend type Query {
    getJob(input: GetJobInput): [Job]
    getJobCompany(input: JobSearchInput): [Job]
    getAllJobs(input: GetAllJobsInput): [JobWithMeta]
    getJobStats(input: JobSearchInput): getJobStats
  }
  input ChangeJobStatusInput {
    action: String
    jobId: ID!
    reason: String
  }

  extend type Mutation {
    addJob(input: PostJobInput!): Job
    addJobCompany(input: AddJobCompanyInput!): Company
    changeJobStatus(input: ChangeJobStatusInput!): Job!
    changeJobVerification(input: ChangeJobStatusInput!): Job!
  }

  # Inputs
  input JobSearchInput {
    value: String
  }

  input GetAllJobsInput {
    # Optional, depending on usage
    filters: String
  }

  input PostJobInput {
    title: String!
    description: String
    location: JSON
    jobType: String!
    salary: String
    experienceLevel: String
    workplaceType: String
    applicationDeadline: DateTime
    requirements: [String]
    responsibilities: [String]
    benefits: [String]
    skills: [String]
    isFeatured: Boolean
    company: CompanyInput
  }

  input CompanyInput {
    id: ID
    name: String!
    logo: String
  }

  input AddJobCompanyInput {
    name: String!
    logo: Upload
  }

  # Types
  # type Page { ... } # Already defined in typeDefs

  type Job {
    id: ID!
    title: String!
    description: String
    location: String
    jobType: String
    salary: String
    experienceLevel: String
    workplaceType: String
    applicationDeadline: DateTime
    requirements: [String]
    responsibilities: [String]
    benefits: [String]
    skills: [String]
    isFeatured: Boolean
    entity: String
    status: jobStatus!
    company: Company
    numberOfApplicant: Int
    numberOfViews: Int
    createdAt: DateTime
    verification: jobVerification
  }

  type jobVerification {
    id: ID!
    isVerifiedAt: String
    verifiedBy: User
    isVerified: Boolean!
    verificationReason: String
  }
  type JobWithMeta {
    id: ID!
    details: Job
    isFeatured: Boolean
    trendingScore: Int
    rank: Int
    isTrending: Boolean
  }

  type Company {
    id: ID
    name: String!
    logo: String
  }
`;

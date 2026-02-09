export const jobsTypes = `#graphql
  scalar Upload
  scalar JSON
  scalar Date

  type user {
    id: ID
    name: String
    email: String
    profile: userProfile
  }

  type location {
    state: String
    country: String
    name: String
  }

  type company {
    logo: String
    name: String
    type: String
  }

  type job {
    id: ID
    title: String!
    company: JSON
    location: JSON
    jobType: String
    experienceLevel: String
    salary: String
    description: String
    applicationLink: String
    applicationDeadline: String
    requirements: [String]
    responsibilities: [String]
    benefits: [String]
    skills: [String]
    workplaceType: String
    createdAt: Date
    isFeatured: Boolean
    isWishList: Boolean
    isTrending: Boolean
    numberOfViews: Int
    numberOfApplicant: Int
  }

  type userApplication {
    resume: String
    appliedAt: Date
    name: String
    email: String
  }

  type jobList {
    id: ID
    isFeatured: Boolean
    isWishList: Boolean
    isTrending: Boolean
    details: job
    postedBy: user
    canReport: Boolean
    canDelete: Boolean
    isOwner: Boolean
    isJobSaved: Boolean
    application: userApplication
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }



  type jobEdge {
    cursor: String
    node: jobList
  }

  type jobConnection {
    edges: [jobEdge]
    pageInfo: PageInfo
    totalCount: Int
  }

  type applicant {
    userId: ID
    name: String
    email: String
    resume: String
    appliedAt: Date
  }



  type applicantEdge {
    cursor: String
    node: applicant
  }

  type applicantConnection {
    edges: [applicantEdge]
    pageInfo: PageInfo
    totalCount: Int
  }

  input inputPostJob {
    title: String!
    company: JSON
    location: JSON
    jobType: String!
    experienceLevel: String!
    salary: String!
    description: String!
    applicationLink: String
    applicationDeadline: String
    requirements: [String]
    responsibilities: [String]
    benefits: [String]
    skills: [String]
    workplaceType: String
  }

  input inputAddCompany {
    logo: Upload
    name: String!
  }

  input inputGetJobs {
    cursor: String
    limit: Int
    search: String
  }

  input inputGetJobsByUserId {
    id: ID!
    cursor: String
    limit: Int
    search: String
  }

  input inputValue {
    value: String
  }

  input inputApplyJob {
    jobId: ID!
    name: String!
    email: String!
    resume: Upload!
  }

  input inputReportJob {
    jobId: ID!
    reason: String!
    description: String
  }

  input inputEditJob {
    jobId: ID!
    title: String
    company: JSON
    location: JSON
    jobType: String
    experienceLevel: String
    salary: String
    description: String
    applicationLink: String
    applicationDeadline: String
    requirements: [String]
    responsibilities: [String]
    benefits: [String]
    skills: [String]
    workplaceType: String
  }

  input getJobDetailsByIdInput {
    id: ID!
  }
  input getApplicantsForJobInput {
    id: ID!
    cursor: String
    limit: Int
  }
  type jobDetails {
    postedBy: user
    isOwner: Boolean
    job: job
  }

  type jobApplicantCount {
    jobId: ID!
    applicantCount: Int!
  }

  input jobIdsInput {
    id: ID!
  }
  type jobStatistics {
    jobId: ID!
    status: String
    numberOfApplicants: Int
    numberOfViews: Int
    numberOfSaves: Int
  }

  type Query {
    getAllJobs(input: inputGetJobs): jobConnection
    getAllJobsUserId(input: inputGetJobsByUserId): jobConnection
    getJobLocation(input: inputValue): [location]
    getJobCompany(input: inputValue): [company]
    getJobDetailsById(input: getJobDetailsByIdInput): jobDetails
    getAllTrendingJobs(input: inputGetJobs): jobConnection
    getFeaturedJobs(input: inputGetJobs): jobConnection
    getMyJobs(input: inputGetJobs): jobConnection
    getAllJobsApplied(input: inputGetJobs): jobConnection
    getApplicantsForJob(input: getApplicantsForJobInput): applicantConnection
    getNumberApplicantOfJobs(input: jobIdsInput!): [jobApplicantCount]
    getJobStatistics(input: jobIdsInput!): [jobStatistics]
  }

  type jobReport {
    id: ID
    jobId: ID
    reportedBy: ID
    entityId: ID
    reason: String
    description: String
    status: String
    createdAt: Date
  }
  input inputReportJob {
    jobId: ID!
    reason: String!
    description: String
  }

  type jobApply {
    success: Boolean
  }

  type Mutation {
    addJob(input: inputPostJob): job
    addJobCompany(input: inputAddCompany!): company
    applyJob(input: inputApplyJob!): jobApply

    deleteJob(jobId: ID!): Boolean
    editJob(input: inputEditJob!): job
    saveJob(jobId: ID!): Boolean
    reportJob(input: inputReportJob!): jobReport
  }
`;

export const jobsTypes = `#graphql
  scalar Upload
  scalar JSON
  scalar Date

  type user {
    id: ID
    name: String
    email: String
    # Add other user fields as needed
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
  }

  type paginationInfo {
    total: Int
    page: Int
    limit: Int
    hasNextPage: Boolean
  }

  type jobListWithPagination {
    jobs: [jobList]
    pagination: paginationInfo
  }

  type applicant {
    userId: ID
    name: String
    email: String
    resume: String
    appliedAt: Date
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
    page: Int
    limit: Int
    search: String
  }

  input inputGetJobsByUserId {
    id: ID!
    page: Int
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
  }

  input getJobDetailsByIdInput {
    id: ID!
  }
  input getApplicantsForJobInput {
    id: ID!
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
    getAllJobs(input: inputGetJobs): jobListWithPagination
    getAllJobsUserId(input: inputGetJobsByUserId): jobListWithPagination
    getJobLocation(input: inputValue): [location]
    getJobCompany(input: inputValue): [company]
    getJobDetailsById(input: getJobDetailsByIdInput): jobDetails
    getAllTrendingJobs(input: inputGetJobs): jobListWithPagination
    getFeaturedJobs(input: inputGetJobs): jobListWithPagination
    getMyJobs(input: inputGetJobs): jobListWithPagination
    getAllJobsApplied(input: inputGetJobs): jobListWithPagination
    getApplicantsForJob(input: getApplicantsForJobInput): [applicant]
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

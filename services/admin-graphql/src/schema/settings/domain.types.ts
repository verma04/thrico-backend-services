// const { Parking } = require('../models/Parking')
const domainTypes = `#graphql
  type CNAMERecord {
    name: String
    value: String
    verified: Boolean
  }

  type TXTRecord {
    name: String
    value: String
    verified: Boolean
  }

  type ARecord {
    name: String
    value: String
    verified: Boolean
  }

  type CustomDomain {
    id: ID!
    domain: String!
    isSubDomain: Boolean
    cname: CNAMERecord
    txt: TXTRecord
    aRecord: ARecord
    isPrimary: Boolean!
    entity: String!
    isVerified: Boolean
    verifiedAt: String
    createdAt: String
    updatedAt: String
    ssl: Boolean
  }

  type domain {
    id: ID
    domain: String
  }
  type dnsStatus {
    message: String
  }
  union updatedDnsStatus = domain | dnsStatus
  type Query {
    getCustomDomain: CustomDomain
    getThricoDomain: domain
    checkDomainIsVerified: domain
    getCustomDomainDetails(input: inputId!): CustomDomain
    checkSSL: CustomDomain
  }
  input inputDomain {
    domain: String!
  }
  type Mutation {
    deleteDomain(input: inputId!): success
    addCustomDomain(input: inputDomain): domain
    checkUpdatedDnsRecord(input: inputId!): CustomDomain
  }
`;

export { domainTypes };

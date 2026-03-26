export const storageTypes = `#graphql
  type StorageStats {
    module: String!
    totalBytes: String!
    fileCount: Int!
  }

  type StorageSummary {
    totalBytes: String!
    totalFileCount: Int!
  }

  extend type Query {
    getStorageStats: [StorageStats!]!
    getStorageSummary: StorageSummary!
  }
`;

export const featureFlagsDefs = `#graphql
  # Input to allow version gating and platform-specific flags
  input FeatureFlagsInput {
    appVersion: String
    platform: String
    entityId: String # Optional for multi-tenancy
  }

  type FeatureFlag {
    key: String!
    value: String! # Return as string, app will parse if needed
  }

  type Query {
    featureFlags(input: FeatureFlagsInput): [FeatureFlag!]!
  }
`;

export const featureFlagsResolvers = {
  Query: {
    featureFlags: (parent: any, { input }: any, context: any) => {
      // Logic for Bottom Bar Design
      // Default: 'simple'
      // To switch: return 'floating'

      return [
        {
          key: "bottom_bar_design",
          value: "simple",
        },
        {
          key: "enable_new_onboarding",
          value: "true",
        },
      ];
    },
  },
};

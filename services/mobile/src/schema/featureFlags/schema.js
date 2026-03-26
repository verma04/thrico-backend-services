"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlagsResolvers = exports.featureFlagsDefs = void 0;
exports.featureFlagsDefs = `#graphql
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
exports.featureFlagsResolvers = {
    Query: {
        featureFlags: (parent, { input }, context) => {
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
//# sourceMappingURL=schema.js.map
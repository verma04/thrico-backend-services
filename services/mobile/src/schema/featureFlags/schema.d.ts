export declare const featureFlagsDefs = "#graphql\n  # Input to allow version gating and platform-specific flags\n  input FeatureFlagsInput {\n    appVersion: String\n    platform: String\n    entityId: String # Optional for multi-tenancy\n  }\n\n  type FeatureFlag {\n    key: String!\n    value: String! # Return as string, app will parse if needed\n  }\n\n  type Query {\n    featureFlags(input: FeatureFlagsInput): [FeatureFlag!]!\n  }\n";
export declare const featureFlagsResolvers: {
    Query: {
        featureFlags: (parent: any, { input }: any, context: any) => {
            key: string;
            value: string;
        }[];
    };
};
//# sourceMappingURL=schema.d.ts.map
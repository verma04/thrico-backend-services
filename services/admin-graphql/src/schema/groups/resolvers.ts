import { approvalResolvers } from "./approval.resolvers";
import { interestsResolvers } from "./interests.resolvers";
import { settingsResolvers } from "./settings.resolvers";
import { themeResolvers } from "./theme.resolvers";

import { dashboardResolvers } from "./dashboard.resolvers";

const groupsResolvers = {
  Query: {
    ...themeResolvers.Query,
    ...interestsResolvers.Query,
    ...settingsResolvers.Query,
    ...approvalResolvers.Query,
    ...dashboardResolvers.Query,
  },
  Mutation: {
    ...themeResolvers.Mutation,
    ...interestsResolvers.Mutation,
    ...settingsResolvers.Mutation,
    ...approvalResolvers.Mutation,
  },
};

export default groupsResolvers;

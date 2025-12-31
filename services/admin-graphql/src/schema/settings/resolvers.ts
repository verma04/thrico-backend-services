import { domainResolvers } from "./domain.resolvers";
import { fontResolvers } from "./font.resolvers";
import { planResolvers } from "./plan.resolvers";

export const settingsResolvers: any = {
  Query: {
    ...domainResolvers.Query,
    ...fontResolvers.Query,
    ...planResolvers.Query,
  },
  Mutation: {
    ...domainResolvers.Mutation,
    ...fontResolvers.Mutation,
    ...planResolvers.Mutation,
  },
};

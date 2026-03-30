import { domainResolvers } from "./domain.resolvers";
import { fontResolvers } from "./font.resolvers";
import { planResolvers } from "./plan.resolvers";
import { emailResolvers } from "./email.resolvers";
import { contactResolvers } from "./contact.resolvers";

export const settingsResolvers: any = {
  Query: {
    ...domainResolvers.Query,
    ...fontResolvers.Query,
    ...planResolvers.Query,
    ...emailResolvers.Query,
    ...contactResolvers.Query,
  },
  Mutation: {
    ...domainResolvers.Mutation,
    ...fontResolvers.Mutation,
    ...planResolvers.Mutation,
    ...emailResolvers.Mutation,
    ...contactResolvers.Mutation,
  },
};

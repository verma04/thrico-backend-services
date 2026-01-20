import { entityResolvers } from "./entity/resolvers";
import { feedResolvers } from "./feed/resolvers";
import { forumResolvers } from "./forum/resolvers";
import { listingResolvers } from "./listing/resolvers";
import { networkResolvers } from "./network/resolvers";
import { userResolvers } from "./user/resolvers";
import { offersResolvers } from "./offers/resolvers";
import { GraphQLUpload } from "graphql-upload-minimal";
const baseResolvers = {
  Query: {
    health: () => "User service is healthy",
  },
};

// Deep merge resolvers
export const resolvers: any = {
  Upload: GraphQLUpload,
  Query: {
    ...baseResolvers.Query,
    ...entityResolvers.Query,
    ...userResolvers.Query,
    ...feedResolvers.Query,
    ...forumResolvers.Query,
    ...listingResolvers.Query,
    ...networkResolvers.Query,
    ...offersResolvers.Query,
  },
  Mutation: {
    ...entityResolvers.Mutation,
    ...userResolvers.Mutation,
    ...feedResolvers.Mutation,
    ...forumResolvers.Mutation,
    ...listingResolvers.Mutation,
    ...networkResolvers.Mutation,
    ...offersResolvers.Mutation,
  },
};

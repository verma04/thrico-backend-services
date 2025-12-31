import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";

export const alumniStoriesResolvers = {
  Query: {
    getAllAlumniStoriesCategory: async () => [],
    getAllAlumniStories: async () => [],
    getAllApprovedAlumniStories: async () => [],
    getAllApprovedRequestedStories: async () => [],
  },
  Mutation: {
    alumniStoriesActions: async () => {
      throw new GraphQLError("Not Implemented");
    },
    adduserStoryCategory: async () => {
      throw new GraphQLError("Not Implemented");
    },
    deleteuserStoryCategory: async () => {
      throw new GraphQLError("Not Implemented");
    },
    duplicateuserStoryCategory: async () => {
      throw new GraphQLError("Not Implemented");
    },
  },
};

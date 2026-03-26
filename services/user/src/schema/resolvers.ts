import { entityResolvers } from "./entity/resolvers";
import { feedResolvers } from "./feed/resolvers";
import { forumResolvers } from "./forum/resolvers";
import { listingResolvers } from "./listing/resolvers";
import { networkResolvers } from "./network/resolvers";
import { userResolvers } from "./user/resolvers";
import { offersResolvers } from "./offers/resolvers";
import { surveyResolvers } from "./survey/resolvers";
import { profileResolvers } from "./profile/resolvers";
import { gamificationResolvers } from "./gamification/resolvers";
import { shopResolvers } from "./shop/resolvers";
import { pollResolvers } from "./poll/resolvers";
import { notificationResolvers } from "./notification/resolvers";
import { jobsResolvers } from "./jobs/resolvers";
import {
  communitiesResolvers,
  communityMemberResolvers,
} from "./community/resolvers";
import { eventsResolvers } from "./events/resolvers";
import { currencyResolvers } from "./currency/resolvers";
import { mentorshipResolvers } from "./mentorship/resolvers";
import { storiesResolvers } from "./stories/resolvers";
import { chatResolvers } from "./chat/resolvers";
import { rewardsResolvers } from "./rewards/resolvers";
import { reportResolvers } from "./report/resolvers";

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
    ...surveyResolvers.Query,
    ...profileResolvers.Query,
    ...gamificationResolvers.Query,
    ...shopResolvers.Query,
    ...pollResolvers.Query,
    ...notificationResolvers.Query,
    ...jobsResolvers.Query,
    ...communitiesResolvers.Query,
    ...communityMemberResolvers.Query,
    ...eventsResolvers.Query,
    ...currencyResolvers.Query,
    // ...mentorshipResolvers.Query,
    ...storiesResolvers.Query,
    ...chatResolvers.Query,
    ...rewardsResolvers.Query,
  },

  Mutation: {
    ...entityResolvers.Mutation,
    ...userResolvers.Mutation,
    ...feedResolvers.Mutation,
    ...forumResolvers.Mutation,
    ...listingResolvers.Mutation,
    ...networkResolvers.Mutation,
    ...offersResolvers.Mutation,
    ...surveyResolvers.Mutation,
    ...profileResolvers.Mutation,
    ...pollResolvers.Mutation,
    ...notificationResolvers.Mutation,
    ...jobsResolvers.Mutation,
    ...communitiesResolvers.Mutation,
    ...eventsResolvers.Mutation,
    ...currencyResolvers.Mutation,
    // ...mentorshipResolvers.Mutation,
    ...storiesResolvers.Mutation,
    ...chatResolvers.Mutation,
    ...rewardsResolvers.Mutation,
    ...reportResolvers.Mutation,
  },
  Subscription: {
    ...chatResolvers.Subscription,
  },
};

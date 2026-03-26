import { eventResolvers } from "./events.resolvers";
import { eventSpeakerResolvers } from "./eventSpeaker.resolvers";
import { eventTeamResolvers } from "./eventTeam.resolvers";

const eventsResolvers = {
  Query: {
    ...eventResolvers.Query,
    ...eventSpeakerResolvers.Query,
    ...eventTeamResolvers.Query,
  },

  Mutation: {
    ...eventResolvers.Mutation,
    ...eventSpeakerResolvers.Mutation,
  },
};

export { eventsResolvers };

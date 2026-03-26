import { eventResolvers } from "./event.resolvers";
import { speakerResolvers } from "./speaker.resolvers";
import { sponsorshipResolvers } from "./sponsorship.resolvers";
import { sponsorResolvers } from "./sponsor.resolvers";
import { venueResolvers } from "./venue.resolvers";
import { agendaResolvers } from "./agenda.resolvers";
import { ticketResolvers } from "./ticket.resolvers";
import { promoCodeResolvers } from "./promoCode.resolvers";
import { registrationResolvers } from "./registration.resolvers";
import { mediaResolvers } from "./media.resolvers";
import { settingsResolvers } from "./settings.resolvers";
import { attendeeResolvers } from "./attendee.resolvers";
import { analyticsResolvers } from "./analytics.resolvers";

export const eventsResolvers = {
  Query: {
    ...eventResolvers.Query,
    ...speakerResolvers.Query,
    ...sponsorshipResolvers.Query,
    ...sponsorResolvers.Query,
    ...venueResolvers.Query,
    ...agendaResolvers.Query,
    ...ticketResolvers.Query,
    ...promoCodeResolvers.Query,
    ...registrationResolvers.Query,
    ...mediaResolvers.Query,
    ...settingsResolvers.Query,
    ...attendeeResolvers.Query,
    ...analyticsResolvers.Query,
  },
  Mutation: {
    ...eventResolvers.Mutation,
    ...speakerResolvers.Mutation,
    ...sponsorshipResolvers.Mutation,
    ...sponsorResolvers.Mutation,
    ...venueResolvers.Mutation,
    ...agendaResolvers.Mutation,
    ...ticketResolvers.Mutation,
    ...promoCodeResolvers.Mutation,
    ...registrationResolvers.Mutation,
    ...mediaResolvers.Mutation,
    ...settingsResolvers.Mutation,
    ...attendeeResolvers.Mutation,
  },
};

import { bookingResolvers } from "./booking.resolvers";
import { categoryResolvers } from "./category.resolvers";
import { mentorResolvers } from "./mentor.resolvers";
import { servicesResolvers } from "./services.resolvers";
import { testimonialsResolvers } from "./testimonials.resolvers";

export const mentorshipResolvers = {
  Query: {
    ...bookingResolvers.Query,
    ...categoryResolvers.Query,
    ...mentorResolvers.Query,
    ...servicesResolvers.Query,
    ...testimonialsResolvers.Query,
  },
  Mutation: {
    ...bookingResolvers.Mutation,
    ...categoryResolvers.Mutation,
    ...servicesResolvers.Mutation,
    ...testimonialsResolvers.Mutation,
    ...mentorResolvers.Mutation,
  },
};

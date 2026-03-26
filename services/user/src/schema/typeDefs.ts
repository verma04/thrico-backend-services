import { entityTypes } from "./entity/types";
import { feedTypes } from "./feed/types";
import { forumTypes } from "./forum/types";
import { listingTypes } from "./listing/types";
import { networkTypes } from "./network/types";
import { pollTypes } from "./poll/types";
import { userTypes } from "./user/types";
import { offersTypes } from "./offers/types";
import { surveyTypes } from "./survey/types";
import { profileTypes } from "./profile/types";
import { gamificationTypes } from "./gamification/types";
import { shopTypes } from "./shop/types";
import { notificationTypes } from "./notification/types";
import { jobsTypes } from "./jobs/types";
import { communitiesTypes } from "./community/types";
import { eventsTypes } from "./events/types";
import { currencyTypes } from "./currency/types";
import { mentorshipTypes } from "./mentorship/types";
import { storiesTypes } from "./stories/types";
import { chatTypes } from "./chat/types";
import { rewardsTypes } from "./rewards/types";
import { reportTypes } from "./report/types";





const baseTypeDefs = `#graphql
  type Query {
    health: String
  }

  type Mutation {
    _empty: String
  }

  type Subscription {
    _empty: String
  }
`;

export const typeDefs = [
  baseTypeDefs,
  entityTypes,
  userTypes,
  feedTypes,
  forumTypes,
  pollTypes,
  listingTypes,
  networkTypes,
  offersTypes,
  surveyTypes,
  profileTypes,
  gamificationTypes,
  shopTypes,
  notificationTypes,
  jobsTypes,
  communitiesTypes,
  eventsTypes,
  currencyTypes,
  mentorshipTypes,
  storiesTypes,
  chatTypes,
  ...rewardsTypes,
  reportTypes,
];





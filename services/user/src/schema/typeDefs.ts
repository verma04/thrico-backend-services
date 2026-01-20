import { entityTypes } from "./entity/types";
import { feedTypes } from "./feed/types";
import { forumTypes } from "./forum/types";
import { listingTypes } from "./listing/types";
import { networkTypes } from "./network/types";
import { pollTypes } from "./poll/types";
import { userTypes } from "./user/types";
import { offersTypes } from "./offers/types";

const baseTypeDefs = `#graphql
  type Query {
    health: String
  }

  type Mutation {
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
];

import dynamoose from "../connection";
import { v4 as uuidv4 } from "uuid";

const pageSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4(),
    },
    user: {
      type: String,
      index: {
        name: "UserIndex",
        type: "global",
      },
    },
    name: String,
    logo: String,
    location: {
      type: Object,
      schema: {
        lat: Number,
        lng: Number,
        name: String,
      },
    },
    type: String,
    industry: String,
    website: String,
    pageType: String,
    size: String,
    tagline: String,
    agreement: Boolean,
  },
  {
    timestamps: true,
  }
);

export const PAGE = dynamoose.model("Page", pageSchema);

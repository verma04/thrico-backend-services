"use strict";

import dynamoose from "../connection";
import { v4 as uuidv4 } from "uuid";

const EntityTypeSchema = new dynamoose.Schema({
  id: {
    type: String,
    default: uuidv4(),
    hashKey: true,
  },
  title: { type: String, required: true },
});

const EntityIndustrySchema = new dynamoose.Schema({
  id: {
    type: String,
    default: uuidv4(),
    hashKey: true,
  },
  title: { type: String, required: true },
});

export enum UserRole {
  manager = "manager",
  admin = "admin",
  superAdmin = "superAdmin",
}

const domainSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      hashKey: true, // Primary key
    },
    isPrimary: {
      type: Boolean,
      required: true,
      default: true,
    },
    domain: {
      type: String,
      required: true,
      index: {
        name: "domainIndex",
        type: "global",
      },
    },
    entity: {
      type: String,
      required: true,
      index: {
        name: "entityIndex",
        type: "global",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Define the model with the schema

const DOMAIN = dynamoose.model("domain", domainSchema);
const OTPSchema = new dynamoose.Schema(
  {
    id: String,
    userId: {
      type: String,
      required: true,
      index: {
        name: "userId",
        type: "global",
      }, // Ensure userId is always provided
    },
    otp: String,

    timeOfExpire: {
      type: Number,
      default: 10,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Domain = dynamoose.model("customDomain", domainSchema);

const LoginSessionSchema = new dynamoose.Schema(
  {
    id: String,
    token: {
      type: String,
      required: true,
      index: {
        name: "token",
        type: "global",
      }, //
    },
    ip: String,
    deviceOs: String,
    deviceId: String,
    userId: String,
    ipAddress: String,

    logout: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const MentorshipCategorySchema = new dynamoose.Schema({
  id: {
    type: String,
    default: uuidv4(),
    hashKey: true,
  },
  title: { type: String, required: true },
});
const mentorshipSkillsSchema = new dynamoose.Schema({
  id: {
    type: String,
    default: uuidv4(),
    hashKey: true,
  },
  title: { type: String, required: true },
});

const MENTORSHIP_SKILLS = dynamoose.model(
  "mentorshipSkills",
  mentorshipSkillsSchema
);
const ENTITY_TYPE = dynamoose.model("EntityType", EntityTypeSchema);

const MENTORSHIP_CATEGORY = dynamoose.model(
  "MentorshipCategory",
  MentorshipCategorySchema
);
const ENTITY_INDUSTRY = dynamoose.model("EntityIndustry", EntityIndustrySchema);

// const ProfileInfo = dynamoose.model("profileInfo", ProfileInfoSchema);
const OTP = dynamoose.model("otp", OTPSchema);
const LOGIN_SESSION = dynamoose.model("session", LoginSessionSchema);

const customDomain = new dynamoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4(),
      hashKey: true,
    },

    domain: {
      type: String,
      required: true,
      index: {
        name: "domainIndex",
        type: "global",
      },
    },

    mainDomain: {
      type: String,
      required: true,
    },

    isSubDomain: Boolean,

    cname: {
      type: Object,
      schema: {
        name: {
          type: String, // e.g., "_cname.thrico.com" or "test.thrico.com"
        },
        value: {
          type: String, // e.g., "test_cname.thrico.network"
        },
        verified: {
          type: Boolean,
          default: false,
        },
      },
    },

    txt: {
      type: Object,
      schema: {
        name: {
          type: String,
        },
        value: {
          type: String,
        },
        verified: {
          type: Boolean,
          default: false,
        },
      },
    },

    aRecord: {
      type: Object,
      schema: {
        name: {
          type: String,
        },
        value: {
          type: String,
        },
        verified: {
          type: Boolean,
          default: false,
        },
      },
    },
    ssl: {
      type: Boolean,
      default: false,
    },

    isPrimary: {
      type: Boolean,
      required: true,
      default: false,
    },
    entity: {
      type: String,
      required: true,
      index: {
        name: "entityIndex",
        type: "global",
      },
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const CUSTOM_DOMAIN = dynamoose.model("customDomain", customDomain);

const entityFont = new dynamoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4(),
      hashKey: true,
    },

    entity: {
      type: String,
      required: true,
      index: {
        name: "entityIndex",
        type: "global",
      },
    },

    name: {
      type: String, // e.g., "ADLaM Display"
      required: true,
    },
    weights: {
      type: Array,
      schema: [String], // e.g., ["400"]
      required: true,
    },
    styles: {
      type: Array,
      schema: [String], // e.g., ["normal"]
      required: true,
    },
    subsets: {
      type: Array,
      schema: [String], // e.g., ["adlam", "latin", "latin-ext"]
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
const ENTITY_FONT = dynamoose.model("entityFont", entityFont);

const UserSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },
    entityId: {
      type: String,
      required: false,
      index: {
        name: "EntityRoleIndex", // make sure this matches your query
        type: "global",
        rangeKey: "role",
      },
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.superAdmin, // Default role is 'manager'
    },
    isEntityCreated: {
      type: Boolean,
      required: false,
      default: true,
    },
    welcomeSent: {
      type: Boolean,
      required: false,
      default: false,
    },
    email: {
      type: String,
      required: true,
      index: {
        name: "EmailIndex",
        type: "global", // for GSI
      },
    },
  },
  {
    timestamps: true,
  }
);

const ADMIN = dynamoose.model("adminEntity", UserSchema);

const entityThemeSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4(),
      hashKey: true,
    },
    entity: {
      type: String,
      required: true,
      index: {
        name: "entityIndex",
        type: "global",
      },
    },
    primaryColor: String,
    secondaryColor: String,
    backgroundColor: String,
    textColor: String,
    buttonColor: String,
    borderRadius: Number,
    borderWidth: Number,
    borderStyle: String,
    borderColor: String,
    inputBackground: String,
    inputBorderColor: String,
    fontSize: Number,
    fontWeight: String,
    boxShadow: String,
    hoverEffect: String,
    Button: {
      type: Object,
      schema: {
        colorPrimary: String,
        colorText: String,
        colorBorder: String,
        borderRadius: Number,
        defaultBg: String,
        defaultColor: String,
        defaultBorderColor: String,
        fontSize: Number,
      },
    },
  },
  {
    timestamps: true,
  }
);

const ENTITY_THEME = dynamoose.model("EntityTheme", entityThemeSchema);

export {
  ADMIN,
  OTP,
  LOGIN_SESSION,
  ENTITY_TYPE,
  ENTITY_INDUSTRY,
  DOMAIN,
  MENTORSHIP_CATEGORY,
  MENTORSHIP_SKILLS,
  CUSTOM_DOMAIN,
  ENTITY_FONT,
  ENTITY_THEME,
};

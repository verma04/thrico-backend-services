"use strict";

import { v4 as uuidv4 } from "uuid";
import dynamoose from "../connection";

const UserSchema = new dynamoose.Schema(
  {
    id: {
      type: String, // Partition key for unique user ID
      hashKey: true,
      default: uuidv4(),
    },
    firstName: {
      type: String,
      required: true,
    },
    avatar: String, // Optional field
    lastName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      validate: (value: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), // Email validation
      index: {
        name: "email-index", // Create a global secondary index for email (if unique)
        project: true,
      },
    },
    loginType: {
      type: String,
      enum: ["google", "facebook", "email"], // Enum validation
      required: true,
    },

    profile: {
      type: String,
      default: "",
    },

    entity: {
      type: Array, // JSON data, map it to an Object (phone could be an array or object of numbers)
      default: [], // Optional: Default value for phone
    },
  },
  {
    timestamps: true,
  }
);

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

const LoginSessionSchema = new dynamoose.Schema(
  {
    id: String,

    ip: String,
    deviceOs: String,
    deviceId: String,
    userId: String,
    ipAddress: String,
    deviceToken: String,
    deviceName: String,
    logout: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
const USER = dynamoose.model("users", UserSchema);

const USER_OTP = dynamoose.model("userOtp", OTPSchema);
const USER_LOGIN_SESSION = dynamoose.model("user_session", LoginSessionSchema);
export { USER, USER_OTP, USER_LOGIN_SESSION };

import { pgEnum } from "drizzle-orm/pg-core";

export const addedBy = pgEnum("addedBy", ["USER", "ENTITY"]);

export const logTypeEnum = pgEnum("enumLogType", [
  "APPROVE",
  "BLOCK",
  "DISABLE",
  "ENABLE",
  "UNBLOCK",
  "REJECT",
  "FLAG",
  "VERIFY",
  "UNVERIFY",
  "REAPPROVE",
]);

export const logStatus = pgEnum("logStatus", [
  "STATUS",
  "ADD",
  "REMOVE",
  "UPDATE",
]);

export const loginTypeEnum = pgEnum("loginType", [
  "EMAIL",
  "GOOGLE",
  "LINKEDIN",
]);

export const device_OStype = pgEnum("device_OStype", ["ANDROID", "IOS", "WEB"]);

export const userEntityStatus = pgEnum("userStatus", [
  "APPROVED",
  "BLOCKED",
  "PENDING",
  "REJECTED",
  "FLAGGED",
  "DISABLED",
]);

export const userPronounsStatus = pgEnum("userPronounsStatus", [
  "they/them",
  "she/her",
  "he/him",
  "other",
]);
export const gender = pgEnum("gender", ["male", "female", "other"]);

export const communityEntityStatus = pgEnum("communityEntityStatus", [
  "APPROVED",
  "BLOCKED",
  "PENDING",
  "REJECTED",
  "PAUSED",
  "DISABLED",
  "ARCHIVED",
]);

export const communityEnum = pgEnum("communityTypeEnum", [
  "VIRTUAL",
  "HYBRID",
  "INPERSON",
]);

export const privacyEnum = pgEnum("communityPrivacy", ["PRIVATE", "PUBLIC"]);

export const joiningConditionEnum = pgEnum("joiningTerms", [
  "ANYONE_CAN_JOIN",
  "ADMIN_ONLY_ADD",
]);

export const status = pgEnum("communityEntityStatus", [
  "APPROVED",
  "BLOCKED",
  "PENDING",
  "REJECTED",
  "PAUSED",
  "DISABLED",
]);

export const logAction = pgEnum("logAction", [
  "STATUS",
  "ADD",
  "REMOVE",
  "UPDATE",
]);

export const reportStatusEnum = pgEnum("reportStatus", [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "DISMISSED",
  "RESOLVED",
]);

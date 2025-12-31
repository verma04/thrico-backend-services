import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  pgEnum,
  date,
  json,
  unique,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

import { groups } from "./communities";
import { user, userToEntity } from "./member/user";
import {
  addedBy,
  communityEntityStatus,
  logAction,
  reportStatusEnum,
  status,
} from "./enum";
import { geometry } from "./geomtry";
import { entity } from "../tenant";

export const jobTypeEnum = pgEnum("jobTypes", [
  "FULL-TIME",
  "PART-TIME",
  "CONTRACT",
  "TEMPORARY",
  "INTERNSHIP",
  "VOLUNTEER",
  "OTHER",
]);
export const workplaceTypeEnum = pgEnum("workplaceTypes", [
  "ON-SITE",
  "HYBRID",
  "REMOTE",
]);

export const experienceLevelTypeEnum = pgEnum("jobExperienceLevel", [
  "ENTRY-LEVEL",
  "MID-LEVEL",
  "SENIOR",
  "LEAD",
  "EXECUTIVE",
]);

export const jobs = pgTable("jobss", {
  id: uuid("id").defaultRandom().primaryKey(),
  postedBy: uuid("postedBy_id"),
  addedBy: addedBy("addedBy"),
  status: communityEntityStatus("status").notNull(),
  entityId: uuid("org_id").notNull(),
  title: text("title").notNull(),
  company: jsonb("company").notNull(),
  salary: text("salary"),
  slug: text("slug"),
  description: text("description").notNull(),
  experienceLevel: experienceLevelTypeEnum("experienceLevel").notNull(),
  jobType: jobTypeEnum("jobType").notNull(),
  workplaceType: workplaceTypeEnum("workplaceType").notNull(),
  isApproved: boolean("isApproved").notNull().default(false),
  isActive: boolean("isActive").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  tag: json("tag"),
  experience: text("experience"),
  interests: text("interests").array(),
  categories: text("categories").array(),
  numberOfViews: integer("numberOfViews").default(0),
  numberOfApplicant: integer("numberOfApplicant").default(0),
  applicationDeadline: date("applicationDeadline"),
  requirements: jsonb("requirements").notNull(),
  responsibilities: jsonb("responsibilities").notNull(),
  benefits: jsonb("benefits").notNull(),
  skills: jsonb("skills").notNull(),
  isFeatured: boolean("isFeatured").notNull().default(false),
  location: jsonb("location").notNull(),
  locationLatLong: geometry("locationLatLong", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }),
});

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  views: many(jobViews),
  group: one(groups, {
    fields: [jobs.id],
    references: [groups.id],
  }),
  postedBy: one(user, {
    fields: [jobs.id],
    references: [user.id],
  }),
  jobApplicant: many(jobApplicant),
  verification: one(jobVerification),
}));

export const jobApplicant = pgTable(
  "jobApplicant",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user: uuid("user_id").notNull(),
    jobId: uuid("jobs_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    fullName: text("fullName").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    resume: text("resume").notNull(),
  },
  (t) => ({
    unq: unique().on(t.user, t.jobId),
    unq2: unique("uniqueJobApplicant").on(t.user, t.jobId),
  })
);

export const jobApplicantRelations = relations(
  jobApplicant,
  ({ one, many }) => ({
    job: one(jobs, {
      fields: [jobApplicant.jobId],
      references: [jobs.id],
    }),
    user: one(userToEntity, {
      fields: [jobApplicant.user],
      references: [userToEntity.userId],
    }),
  })
);

export const jobViews = pgTable(
  "jobViews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("jobId")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: uuid("userId").notNull(),
    viewedAt: timestamp("viewedAt").defaultNow(),
  },
  (t) => ({
    unq: unique().on(t.jobId, t.userId),
  })
);

export const jobViewsRelations = relations(jobViews, ({ one }) => ({
  job: one(jobs, {
    fields: [jobViews.jobId],
    references: [jobs.id],
  }),
  user: one(userToEntity, {
    fields: [jobViews.userId],
    references: [userToEntity.userId],
  }),
}));

export const jobVerification = pgTable("jobsVerification", {
  id: uuid("id").defaultRandom().primaryKey(),
  isVerifiedAt: timestamp("isVerifiedAt"),
  verifiedBy: uuid("verifiedBy"),
  isVerified: boolean("isVerified").default(false),
  verificationReason: text("verificationReason"),
  jobId: uuid("jobId").notNull(),
});

export const jobVerificationRelations = relations(
  jobVerification,
  ({ one }) => ({
    job: one(jobs, {
      fields: [jobVerification.jobId],
      references: [jobs.id],
    }),
  })
);

export const jobLogs = pgTable("jobAuditLogs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("jobId").notNull(),
  status: communityEntityStatus("logStatus"), // e.g., "APPROVED", "REQUESTED", "REJECTED"
  performedBy: uuid("performedBy").notNull(), // The admin/moderator or user who triggered the action
  reason: text("reason"), // Optional reason for the change
  previousState: jsonb("previousState"), // Optionally store the previous record state
  newState: jsonb("newState"), // Optionally store the new record state
  createdAt: timestamp("created_at").defaultNow(),
  entity: uuid("entity").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  action: logAction("action"),
});

export const jobLogsRelations = relations(jobLogs, ({ one }) => ({
  job: one(jobs, {
    fields: [jobLogs.jobId],
    references: [jobs.id],
  }),
  performedBy: one(user, {
    fields: [jobLogs.performedBy],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [jobLogs.entity],
    references: [entity.id],
  }),
}));

export const jobApplications = pgTable(
  "jobApplications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    resume: text("resume").notNull(),
    appliedAt: timestamp("applied_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    unq: unique().on(t.userId, t.jobId),
  })
);

// Optionally, add relations for jobApplications
export const jobApplicationsRelations = relations(
  jobApplications,
  ({ one }) => ({
    job: one(jobs, {
      fields: [jobApplications.jobId],
      references: [jobs.id],
    }),
    user: one(userToEntity, {
      fields: [jobApplications.userId],
      references: [userToEntity.userId],
    }),
  })
);

export const jobReportStatusEnum = pgEnum("jobReportStatus", [
  "PENDING",
  "REVIEWED",
  "RESOLVED",
  "REJECTED",
]);

export const jobReportReasonEnum = pgEnum("jobReportReason", [
  "SPAM",
  "INAPPROPRIATE",
  "SCAM",
  "MISLEADING",
  "OTHER",
]);

export const jobReports = pgTable(
  "jobReports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("jobId")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    reportedBy: uuid("reportedBy").notNull(),
    entityId: uuid("entityId").notNull(),
    reason: jobReportReasonEnum("reason").notNull(),
    description: text("description"),
    status: reportStatusEnum("status").notNull().default("PENDING"),
    reviewedBy: uuid("reviewedBy"),
    reviewedAt: timestamp("reviewedAt"),
    reviewNotes: text("reviewNotes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    unq: unique().on(t.jobId, t.reportedBy),
  })
);

export const jobReportsRelations = relations(jobReports, ({ one }) => ({
  job: one(jobs, {
    fields: [jobReports.jobId],
    references: [jobs.id],
  }),
  reporter: one(userToEntity, {
    fields: [jobReports.reportedBy],
    references: [userToEntity.userId],
  }),
  reviewer: one(userToEntity, {
    fields: [jobReports.reviewedBy],
    references: [userToEntity.userId],
  }),
}));

export const savedJobs = pgTable(
  "savedJobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("jobId")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: uuid("userId").notNull(),
    savedAt: timestamp("savedAt").defaultNow(),
  },
  (t) => ({
    unq: unique().on(t.jobId, t.userId), // Prevent duplicate saves
  })
);

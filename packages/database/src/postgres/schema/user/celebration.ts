import { pgEnum, pgTable, varchar, text, uuid } from "drizzle-orm/pg-core";
import { pollsStatus } from "./polls";
import { relations } from "drizzle-orm";
import { user } from "./member";

export const celebrationTypeEnum = pgEnum("celebration_type", [
  "project_launch",
  "work_anniversary",
  "new_position",
  "educational_milestone",
  "new_certification",
  "achievement",
  "promotion",
  "graduation",
]);

export const celebration = pgTable("celebration", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: pollsStatus("status").notNull().default("APPROVED"),
  userId: uuid("user_id"),
  entityId: uuid("entity_id").notNull(),
  celebrationType: celebrationTypeEnum("celebrationType").notNull(),
  title: varchar("title", { length: 128 }),
  description: text("description"),
  cover: text("cover"),
});

export const celebrationRelations = relations(celebration, ({ one, many }) => ({
  user: one(user, {
    fields: [celebration.userId],
    references: [user.id],
  }),
}));

export type CelebrationType =
  | "project_launch"
  | "work_anniversary"
  | "new_position"
  | "educational_milestone"
  | "new_certification"
  | "achievement"
  | "promotion"
  | "graduation";

export interface CelebrationOption {
  id: CelebrationType;
  title: string;

  icon?: string;
  defaultImages: string[];
  description: string[];
  defaultDescription: string;
}

export interface CelebrationData {
  type: CelebrationType | null;
  selectedImage: string | null;
  customImage: string | null;
  title: string;
  description: string;
  customDescription: string;
}

import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { geometry } from "./geomtry";

export const cities = pgTable("cities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  boundaryPolygon: geometry("boundary_polygon", {
    //@ts-ignore
    type: "polygon",
    mode: "xy",
    srid: 4326,
  }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const citiesRelations = relations(cities, ({ many }) => ({
  // We can add relations back if needed
}));

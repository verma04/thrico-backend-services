"use strict";
// drizzle/schema/menu.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityFooterRelations = exports.entityNavbarRelations = exports.siteSocialMediaRelations = exports.entityFooter = exports.entityNavbar = exports.siteSocialMedia = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const details_1 = require("../details");
// Adjust path if needed
exports.siteSocialMedia = (0, pg_core_1.pgTable)("site_social_media", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    platform: (0, pg_core_1.text)("platform").notNull(), // e.g. "facebook"
    url: (0, pg_core_1.text)("url").notNull(),
    entity: (0, pg_core_1.uuid)("entity_id"),
});
exports.entityNavbar = (0, pg_core_1.pgTable)("entity_navbar", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    entity: (0, pg_core_1.uuid)("entity_id").notNull(),
    items: (0, pg_core_1.jsonb)("items").notNull(),
});
exports.entityFooter = (0, pg_core_1.pgTable)("entity_footer", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    entity: (0, pg_core_1.uuid)("entity_id").notNull(),
    footer: (0, pg_core_1.jsonb)("footer").notNull(),
});
exports.siteSocialMediaRelations = (0, drizzle_orm_1.relations)(exports.siteSocialMedia, ({ one }) => ({
    entity: one(details_1.entity, {
        fields: [exports.siteSocialMedia.entity],
        references: [details_1.entity.id],
    }),
}));
exports.entityNavbarRelations = (0, drizzle_orm_1.relations)(exports.entityNavbar, ({ one }) => ({
    entity: one(details_1.entity, {
        fields: [exports.entityNavbar.entity],
        references: [details_1.entity.id],
    }),
}));
exports.entityFooterRelations = (0, drizzle_orm_1.relations)(exports.entityFooter, ({ one }) => ({
    entity: one(details_1.entity, {
        fields: [exports.entityFooter.entity],
        references: [details_1.entity.id],
    }),
}));
//# sourceMappingURL=index.js.map
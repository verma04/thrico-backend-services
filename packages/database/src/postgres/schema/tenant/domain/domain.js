"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainRelations = exports.domain = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const details_1 = require("../entity/details");
exports.domain = (0, pg_core_1.pgTable)("entityDomain", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    domain: (0, pg_core_1.text)("domain").notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    entity: (0, pg_core_1.uuid)("entity"),
});
exports.domainRelations = (0, drizzle_orm_1.relations)(exports.domain, ({ one }) => ({
    entity: one(details_1.entity, {
        fields: [exports.domain.entity],
        references: [details_1.entity.id],
    }),
}));
//# sourceMappingURL=domain.js.map
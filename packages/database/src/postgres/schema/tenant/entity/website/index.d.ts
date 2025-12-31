export declare const siteSocialMedia: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "site_social_media";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "site_social_media";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        platform: import("drizzle-orm/pg-core").PgColumn<{
            name: "platform";
            tableName: "site_social_media";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        url: import("drizzle-orm/pg-core").PgColumn<{
            name: "url";
            tableName: "site_social_media";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        entity: import("drizzle-orm/pg-core").PgColumn<{
            name: "entity_id";
            tableName: "site_social_media";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const entityNavbar: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "entity_navbar";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "entity_navbar";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        entity: import("drizzle-orm/pg-core").PgColumn<{
            name: "entity_id";
            tableName: "entity_navbar";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        items: import("drizzle-orm/pg-core").PgColumn<{
            name: "items";
            tableName: "entity_navbar";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const entityFooter: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "entity_footer";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "entity_footer";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        entity: import("drizzle-orm/pg-core").PgColumn<{
            name: "entity_id";
            tableName: "entity_footer";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        footer: import("drizzle-orm/pg-core").PgColumn<{
            name: "footer";
            tableName: "entity_footer";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const siteSocialMediaRelations: import("drizzle-orm").Relations<"site_social_media", {
    entity: import("drizzle-orm").One<"entity", false>;
}>;
export declare const entityNavbarRelations: import("drizzle-orm").Relations<"entity_navbar", {
    entity: import("drizzle-orm").One<"entity", true>;
}>;
export declare const entityFooterRelations: import("drizzle-orm").Relations<"entity_footer", {
    entity: import("drizzle-orm").One<"entity", true>;
}>;
//# sourceMappingURL=index.d.ts.map
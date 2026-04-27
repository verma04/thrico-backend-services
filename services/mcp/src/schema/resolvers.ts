import { GraphQLScalarType, Kind } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { getDb } from "@thrico/database";
import { mcpKeys, mcpLogs } from "@thrico/database";
import { nanoid } from "nanoid";
import { eq, desc } from "drizzle-orm";

const db = getDb();

const DateScalar = new GraphQLScalarType({
  name: "Date",
  description: "Date custom scalar type",
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

export const resolvers = {
  JSON: GraphQLJSON,
  Date: DateScalar,
  Query: {
    mcpKeys: async (_: any, __: any, context: any) => {
      // For now returning all, but should filter by entityId from context
      return await db.select().from(mcpKeys);
    },
    mcpLogs: async (_: any, { limit = 50 }: any) => {
      return await db.select().from(mcpLogs).orderBy(desc(mcpLogs.timestamp)).limit(limit);
    },
  },
  Mutation: {
    generateMCPKey: async (_: any, { name, permissions }: any, context: any) => {
      const apiKey = `mcp_sk_${nanoid(32)}`;
      const entityId = context.user?.entityId || "00000000-0000-0000-0000-000000000000"; // Fallback for dev
      
      const [newKey] = await db.insert(mcpKeys).values({
        name,
        permissions,
        apiKey,
        entityId,
      }).returning();
      
      return newKey;
    },
    updateMCPKey: async (_: any, { id, status }: any) => {
      const [updated] = await db.update(mcpKeys).set({ status, updatedAt: new Date() }).where(eq(mcpKeys.id, id)).returning();
      return updated;
    },
    revokeMCPKey: async (_: any, { id }: any) => {
      await db.update(mcpKeys).set({ status: "revoked", updatedAt: new Date() }).where(eq(mcpKeys.id, id));
      return true;
    }
  }
};

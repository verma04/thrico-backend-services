import { mcpKeys, mcpLogs } from "@thrico/database";
import { nanoid } from "nanoid";
import { eq, desc, and } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { ErrorCode } from "@thrico/shared";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { log } from "@thrico/logging";

export const mcpResolvers = {
  Query: {
    mcpKeys: async (_: any, __: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        const { entity, db } = auth;
        return await db
          .select()
          .from(mcpKeys)
          .where(eq(mcpKeys.entityId, entity));
      } catch (error: any) {
        log.error("Failed to fetch MCP keys", {
          error: error.message,
          stack: error.stack,
        });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to fetch MCP keys", {
          extensions: { code: ErrorCode.INTERNAL_SERVER_ERROR },
        });
      }
    },
    mcpLogs: async (_: any, { limit = 50 }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        const { entity, db } = auth;
        return await db
          .select()
          .from(mcpLogs)
          .where(eq(mcpLogs.entityId, entity))
          .orderBy(desc(mcpLogs.timestamp))
          .limit(limit);
      } catch (error: any) {
        log.error("Failed to fetch MCP logs", {
          error: error.message,
          stack: error.stack,
        });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to fetch MCP logs", {
          extensions: { code: ErrorCode.INTERNAL_SERVER_ERROR },
        });
      }
    },
  },
  Mutation: {
    generateMCPKey: async (
      _: any,
      { name, permissions }: any,
      context: any,
    ) => {
      try {
        const auth = await checkAuth(context);
        const { entity, db } = auth;
        const apiKey = `mcp_sk_${nanoid(32)}`;

        const [newKey] = await db
          .insert(mcpKeys)
          .values({
            name,
            permissions,
            apiKey,
            entityId: entity,
          })
          .returning();

        log.info("New MCP key generated", { keyId: newKey.id, entityId: entity });
        return newKey;
      } catch (error: any) {
        log.error("Failed to generate MCP key", {
          error: error.message,
          stack: error.stack,
        });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to generate MCP key", {
          extensions: { code: ErrorCode.INTERNAL_SERVER_ERROR },
        });
      }
    },
    updateMCPKey: async (_: any, { id, status }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        const { entity, db } = auth;
        const [updated] = await db
          .update(mcpKeys)
          .set({ status, updatedAt: new Date() })
          .where(and(eq(mcpKeys.id, id), eq(mcpKeys.entityId, entity)))
          .returning();
        return updated;
      } catch (error: any) {
        log.error("Failed to update MCP key", {
          error: error.message,
          stack: error.stack,
          id,
        });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to update MCP key", {
          extensions: { code: ErrorCode.INTERNAL_SERVER_ERROR },
        });
      }
    },
    revokeMCPKey: async (_: any, { id }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        const { entity, db } = auth;
        await db
          .update(mcpKeys)
          .set({ status: "revoked", updatedAt: new Date() })
          .where(and(eq(mcpKeys.id, id), eq(mcpKeys.entityId, entity)));
        return true;
      } catch (error: any) {
        log.error("Failed to revoke MCP key", {
          error: error.message,
          stack: error.stack,
          id,
        });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to revoke MCP key", {
          extensions: { code: ErrorCode.INTERNAL_SERVER_ERROR },
        });
      }
    },
  },
};

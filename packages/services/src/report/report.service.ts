import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, sql, desc } from "drizzle-orm";
import { reports } from "@thrico/database";

export class ReportService {
  static async reportContent({
    db,
    entityId,
    reporterId,
    input,
  }: {
    db: any;
    entityId: string;
    reporterId: string;
    input: {
      targetId: string;
      module: "FEED" | "MEMBER" | "DISCUSSION_FORUM" | "COMMUNITY" | "JOB" | "LISTING" | "MOMENT" | "OFFER" | "EVENT" | "USER" | "SHOP" | "SURVEY";
      reason: string;
      description?: string;
    };
  }) {
    try {
      if (!entityId || !reporterId || !input.targetId || !input.module || !input.reason) {
        throw new GraphQLError(
          "Entity ID, Reporter ID, Target ID, Module, and Reason are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Reporting content", {
        entityId,
        reporterId,
        targetId: input.targetId,
        module: input.module,
        reason: input.reason,
      });

      // Check for existing report to prevent duplicates from the same user
      const existing = await db.query.reports.findFirst({
        where: (reports: any, { and, eq }: any) =>
          and(
            eq(reports.targetId, input.targetId),
            eq(reports.module, input.module),
            eq(reports.reportedBy, reporterId),
            eq(reports.entityId, entityId)
          ),
      });

      if (existing) {
        throw new GraphQLError("You have already reported this content.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const [report] = await db
        .insert(reports)
        .values({
          targetId: input.targetId,
          module: input.module,
          reportedBy: reporterId,
          entityId: entityId,
          reason: input.reason,
          description: input.description,
          status: "PENDING",
        })
        .returning();

      log.info("Content reported successfully", {
        reportId: report.id,
        targetId: input.targetId,
        module: input.module,
      });

      return report;
    } catch (error) {
      log.error("Error in reportContent service", { error, input });
      throw error;
    }
  }

  static async getAllReports({
    db,
    entityId,
    module,
    status,
    page = 1,
    limit = 10,
  }: {
    db: any;
    entityId: string;
    module?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const offset = (page - 1) * limit;
      const conditions = [eq(reports.entityId, entityId)];
      
      if (module) conditions.push(eq(reports.module, module as any));
      if (status) conditions.push(eq(reports.status, status as any));

      const data = await db
        .select()
        .from(reports)
        .where(and(...conditions))
        .orderBy(desc(reports.createdAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reports)
        .where(and(...conditions));

      const total = totalCount[0]?.count || 0;

      return {
        reports: data,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      log.error("Error in getAllReports service", { error, entityId });
      throw error;
    }
  }

  static async updateReportStatus({
    db,
    entityId,
    reportId,
    status,
  }: {
    db: any;
    entityId: string;
    reportId: string;
    status: "PENDING" | "RESOLVED" | "DISMISSED";
  }) {
    try {
      const [updated] = await db
        .update(reports)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(reports.id, reportId), eq(reports.entityId, entityId)))
        .returning();

      if (!updated) {
        throw new GraphQLError("Report not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return updated;
    } catch (error) {
      log.error("Error in updateReportStatus service", { error, reportId });
      throw error;
    }
  }
}

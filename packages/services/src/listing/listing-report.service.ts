import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, sql, desc } from "drizzle-orm";

export class ListingReportService {
  static async reportListing({
    db,
    entityId,
    userId,
    input,
  }: {
    db: any;
    entityId: string;
    userId: string;
    input: {
      listingId: string;
      reason: string;
      description?: string;
    };
  }) {
    try {
      if (!entityId || !userId || !input.listingId || !input.reason) {
        throw new GraphQLError(
          "Entity ID, User ID, Listing ID, and Reason are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Reporting listing", {
        entityId,
        userId,
        listingId: input.listingId,
        reason: input.reason,
      });

      const listing = await this.getListingDetails(db, input.listingId);

      if (!listing) {
        throw new GraphQLError("Listing not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (listing.postedBy === userId) {
        throw new GraphQLError("You cannot report your own listing.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const existingReport = await this.findExistingReport(
        db,
        input.listingId,
        userId
      );

      if (existingReport) {
        throw new GraphQLError("You have already reported this listing.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const [report] = await db
        .insert(db.schema.listingReport)
        .values({
          listingId: input.listingId,
          reportedBy: userId,
          entityId: entityId,
          reason: input.reason,
          description: input.description,
          status: "PENDING",
        })
        .returning();

      log.info("Listing reported successfully", {
        reportId: report.id,
        listingId: input.listingId,
        userId,
      });

      return {
        success: true,
        reportId: report.id,
        message: "Listing reported successfully",
      };
    } catch (error) {
      log.error("Error in reportListing", {
        error,
        entityId,
        userId,
        listingId: input?.listingId,
      });
      throw error;
    }
  }

  static async getListingReports({
    db,
    listingId,
    page = 1,
    limit = 10,
  }: {
    db: any;
    listingId: string;
    page?: number;
    limit?: number;
  }) {
    try {
      if (!listingId) {
        throw new GraphQLError("Listing ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting listing reports", { listingId, page, limit });

      const offset = (page - 1) * limit;

      const reports = await db
        .select({
          id: db.schema.listingReport.id,
          reason: db.schema.listingReport.reason,
          description: db.schema.listingReport.description,
          status: db.schema.listingReport.status,
          createdAt: db.schema.listingReport.createdAt,
          reviewNotes: db.schema.listingReport.reviewNotes,
          reviewedAt: db.schema.listingReport.reviewedAt,
          reportedBy: {
            id: db.schema.user.id,
            email: db.schema.user.email,
          },
        })
        .from(db.schema.listingReport)
        .leftJoin(
          db.schema.user,
          eq(db.schema.listingReport.reportedBy, db.schema.user.id)
        )
        .where(eq(db.schema.listingReport.listingId, listingId))
        .orderBy(desc(db.schema.listingReport.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(db.schema.listingReport)
        .where(eq(db.schema.listingReport.listingId, listingId));

      log.info("Listing reports retrieved", {
        listingId,
        count: reports.length,
        total,
      });

      return {
        reports,
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
      log.error("Error in getListingReports", { error, listingId });
      throw error;
    }
  }

  static async getAllReports({
    db,
    entityId,
    status,
    page = 1,
    limit = 10,
  }: {
    db: any;
    entityId: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      if (!entityId) {
        throw new GraphQLError("Entity ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting all reports", { entityId, status, page, limit });

      const offset = (page - 1) * limit;

      const conditions = [eq(db.schema.listingReport.entityId, entityId)];
      if (status) {
        conditions.push(eq(db.schema.listingReport.status, status as any));
      }

      const reports = await db
        .select({
          id: db.schema.listingReport.id,
          reason: db.schema.listingReport.reason,
          description: db.schema.listingReport.description,
          status: db.schema.listingReport.status,
          createdAt: db.schema.listingReport.createdAt,
          reviewNotes: db.schema.listingReport.reviewNotes,
          reviewedAt: db.schema.listingReport.reviewedAt,
          listing: {
            id: db.schema.marketPlace.id,
            title: db.schema.marketPlace.title,
            slug: db.schema.marketPlace.slug,
          },
          reportedBy: {
            id: db.schema.user.id,
            email: db.schema.user.email,
          },
        })
        .from(db.schema.listingReport)
        .leftJoin(
          db.schema.marketPlace,
          eq(db.schema.listingReport.listingId, db.schema.marketPlace.id)
        )
        .leftJoin(
          db.schema.user,
          eq(db.schema.listingReport.reportedBy, db.schema.user.id)
        )
        .where(and(...conditions))
        .orderBy(desc(db.schema.listingReport.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(db.schema.listingReport)
        .where(and(...conditions));

      log.info("All reports retrieved", {
        entityId,
        status,
        count: reports.length,
        total,
      });

      return {
        reports,
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
      log.error("Error in getAllReports", { error, entityId, status });
      throw error;
    }
  }

  static async updateReportStatus({
    db,
    userId,
    input,
  }: {
    db: any;
    userId: string;
    input: {
      reportId: string;
      status:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "UNDER_REVIEW"
        | "DISMISSED";
      reviewNotes?: string;
    };
  }) {
    try {
      if (!userId || !input.reportId || !input.status) {
        throw new GraphQLError("User ID, Report ID, and Status are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating report status", {
        userId,
        reportId: input.reportId,
        status: input.status,
      });

      const [updatedReport] = await db
        .update(db.schema.listingReport)
        .set({
          status: input.status,
          reviewNotes: input.reviewNotes,
          reviewedBy: userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(db.schema.listingReport.id, input.reportId))
        .returning();

      if (!updatedReport) {
        throw new GraphQLError("Report not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("Report status updated", {
        reportId: updatedReport.id,
        status: input.status,
      });

      return {
        success: true,
        reportId: updatedReport.id,
        message: "Report status updated successfully",
      };
    } catch (error) {
      log.error("Error in updateReportStatus", {
        error,
        userId,
        reportId: input?.reportId,
      });
      throw error;
    }
  }

  static async getUserReports({
    db,
    userId,
    page = 1,
    limit = 10,
  }: {
    db: any;
    userId: string;
    page?: number;
    limit?: number;
  }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting user reports", { userId, page, limit });

      const offset = (page - 1) * limit;

      const reports = await db
        .select({
          id: db.schema.listingReport.id,
          reason: db.schema.listingReport.reason,
          description: db.schema.listingReport.description,
          status: db.schema.listingReport.status,
          createdAt: db.schema.listingReport.createdAt,
          reviewNotes: db.schema.listingReport.reviewNotes,
          listing: {
            id: db.schema.marketPlace.id,
            title: db.schema.marketPlace.title,
            slug: db.schema.marketPlace.slug,
          },
        })
        .from(db.schema.listingReport)
        .leftJoin(
          db.schema.marketPlace,
          eq(db.schema.listingReport.listingId, db.schema.marketPlace.id)
        )
        .where(eq(db.schema.listingReport.reportedBy, userId))
        .orderBy(desc(db.schema.listingReport.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(db.schema.listingReport)
        .where(eq(db.schema.listingReport.reportedBy, userId));

      log.info("User reports retrieved", {
        userId,
        count: reports.length,
        total,
      });

      return {
        reports,
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
      log.error("Error in getUserReports", { error, userId });
      throw error;
    }
  }

  static async deleteReport({
    db,
    reportId,
    userId,
  }: {
    db: any;
    reportId: string;
    userId: string;
  }) {
    try {
      if (!reportId || !userId) {
        throw new GraphQLError("Report ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Deleting report", { reportId, userId });

      const [deleted] = await db
        .delete(db.schema.listingReport)
        .where(
          and(
            eq(db.schema.listingReport.id, reportId),
            eq(db.schema.listingReport.reportedBy, userId)
          )
        )
        .returning();

      if (!deleted) {
        throw new GraphQLError("Report not found or unauthorized.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("Report deleted successfully", { reportId, userId });

      return {
        success: true,
        message: "Report deleted successfully",
      };
    } catch (error) {
      log.error("Error in deleteReport", { error, reportId, userId });
      throw error;
    }
  }

  private static async getListingDetails(db: any, listingId: string) {
    return await db.query.marketPlace.findFirst({
      where: (marketPlace: any, { eq }: any) => eq(marketPlace.id, listingId),
      columns: {
        id: true,
        postedBy: true,
      },
    });
  }

  private static async findExistingReport(
    db: any,
    listingId: string,
    userId: string
  ) {
    return await db.query.listingReport.findFirst({
      where: (listingReport: any, { and, eq }: any) =>
        and(
          eq(listingReport.listingId, listingId),
          eq(listingReport.reportedBy, userId)
        ),
    });
  }
}

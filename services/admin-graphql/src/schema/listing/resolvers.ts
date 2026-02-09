import { and, eq, sql } from "drizzle-orm";
import { GraphQLError } from "graphql";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  listingLogs,
  listingVerification,
  marketPlace,
  marketPlaceMedia,
  userFeed,
} from "@thrico/database";
import uploadFeedImage from "../../utils/upload/uploadFeedImage.utils";
import { entityClient } from "@thrico/grpc";

export const listingResolvers = {
  Query: {
    async getListing(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const { status } = input; // status: "ALL" | "APPROVED" | "PENDING" | "REJECTED" | "DISABLED"

        let whereClause;
        if (status === "APPROVED") {
          whereClause = (listing: any, { eq }: any) =>
            and(eq(listing.entityId, entity), eq(listing.status, "APPROVED"));
        } else if (status === "PENDING") {
          whereClause = (listing: any, { eq }: any) =>
            and(eq(listing.entityId, entity), eq(listing.status, "PENDING"));
        } else if (status === "REJECTED") {
          whereClause = (listing: any, { eq }: any) =>
            and(eq(listing.entityId, entity), eq(listing.status, "REJECTED"));
        } else if (status === "DISABLED") {
          whereClause = (listing: any, { eq }: any) =>
            and(eq(listing.entityId, entity), eq(listing.status, "DISABLED"));
        } else {
          // ALL or undefined
          whereClause = (listing: any, { eq }: any) =>
            eq(listing.entityId, entity);
        }

        const listing = await db.query.marketPlace.findMany({
          where: whereClause,
          with: {
            verification: true,
            media: true,
          },
          orderBy: (listing: any, { desc }: any) => desc(listing.updatedAt),
        });

        return listing;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getListingDetailsByID(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { listingId } = input;

        // Fetch the listing details with related data
        const listing = await db.query.marketPlace.findFirst({
          where: (listing: any, { eq, and }: any) =>
            and(eq(listing.id, listingId), eq(listing.entityId, entity)),
          with: {
            verification: true,
            media: true, // Added media include as it is part of type
          },
        });

        if (!listing) {
          throw new GraphQLError("Listing not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        return listing;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },

    async getListingStats(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        // 1. Total Listings (current and last month)
        const now = new Date();
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Total listings till now
        const totalListingsResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(marketPlace)
          .where(eq(marketPlace.entityId, entity));
        const totalListings = totalListingsResult[0]?.count || 0;

        // Total listings till end of last month
        const totalListingsLastMonthResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.entityId, entity),
              sql`${marketPlace.createdAt} <= ${endOfLastMonth}`,
            ),
          );
        const totalListingsLastMonth =
          totalListingsLastMonthResult[0]?.count || 0;

        // 2. Active Listings (status = APPROVED)
        const activeListingsResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.entityId, entity),
              eq(marketPlace.status, "APPROVED"),
            ),
          );
        const activeListings = activeListingsResult[0]?.count || 0;

        // 3. Verified Listings (listingVerification.isVerified = true)
        const verifiedListingsResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(listingVerification)
          .where(eq(listingVerification.isVerified, true))
          .innerJoin(
            marketPlace,
            and(
              eq(listingVerification.listingId, marketPlace.id),
              eq(marketPlace.entityId, entity),
            ),
          );
        const verifiedListings = verifiedListingsResult[0]?.count || 0;

        // 4. Total Views (sum of views field)
        const viewsResult = await db
          .select({ total: sql<number>`SUM(${marketPlace.numberOfViews})` })
          .from(marketPlace)
          .where(eq(marketPlace.entityId, entity));
        const totalViews = viewsResult[0]?.total || 0;

        // Views this week (Logic adjusted to match intent "last week" usually means past 7 days or current week so far)
        // Original code: startOfThisWeek.setDate(now.getDate() - now.getDay()); (Sunday logic)
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - now.getDay());

        const viewsThisWeekResult = await db
          .select({ total: sql<number>`SUM(${marketPlace.numberOfViews})` })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.entityId, entity),
              sql`${marketPlace.updatedAt} >= ${startOfThisWeek}`,
            ),
          );
        const viewsThisWeek = viewsThisWeekResult[0]?.total || 0;

        // Calculate stats
        const listingsDiff = totalListings - totalListingsLastMonth;
        const activePercent =
          totalListings > 0
            ? Math.round((activeListings / totalListings) * 100)
            : 0;
        const verifiedPercent =
          totalListings > 0
            ? Math.round((verifiedListings / totalListings) * 100)
            : 0;
        const viewsPercent =
          totalViews > 0 ? Math.round((viewsThisWeek / totalViews) * 100) : 0;

        return {
          totalListings: totalListings.toString(),
          listingsDiff: listingsDiff.toString(),
          activeListings: activeListings.toString(),
          activePercent: activePercent.toString(),
          verifiedListings: verifiedListings.toString(),
          verifiedPercent: verifiedPercent.toString(),
          totalViews: totalViews.toString(),
          viewsPercent: viewsPercent.toString(),
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getListingStatsById(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { listingId } = input;

        // 1. Total Views (all time)
        const viewsResult = await db
          .select({ total: sql<number>`SUM(${marketPlace.numberOfViews})` })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.id, listingId),
              eq(marketPlace.entityId, entity),
            ),
          );
        const totalViews = viewsResult[0]?.total || 0;

        // 2. Unique Views (assuming you have a unique views table, else fallback to totalViews)
        const uniqueViews = totalViews;

        // 3. Contact Clicks (all time) - assuming column exists
        const contactClicksResult = await db
          .select({
            total: sql<number>`SUM(${marketPlace.numberOfContactClick})`, // Verify column match later
          })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.id, listingId),
              eq(marketPlace.entityId, entity),
            ),
          );
        const totalContactClicks = contactClicksResult[0]?.total || 0;

        // 4. Contact Rate (%)
        const contactRate =
          totalViews > 0
            ? Math.round((totalContactClicks / totalViews) * 100)
            : 0;

        // 5. Weekly Views Comparison
        const now = new Date();
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - now.getDay());
        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

        // This week
        const thisWeekViewsResult = await db
          .select({ total: sql<number>`SUM(${marketPlace.numberOfViews})` })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.id, listingId),
              eq(marketPlace.entityId, entity),
              sql`${marketPlace.updatedAt} >= ${startOfThisWeek}`,
            ),
          );
        const thisWeekViews = thisWeekViewsResult[0]?.total || 0;

        // Last week
        const lastWeekViewsResult = await db
          .select({ total: sql<number>`SUM(${marketPlace.numberOfViews})` })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.id, listingId),
              eq(marketPlace.entityId, entity),
              sql`${marketPlace.updatedAt} >= ${startOfLastWeek}`,
              sql`${marketPlace.updatedAt} < ${startOfThisWeek}`,
            ),
          );
        const lastWeekViews = lastWeekViewsResult[0]?.total || 0;

        // Weekly difference
        const weeklyViewsDiff = thisWeekViews - lastWeekViews;

        return {
          totalViews: totalViews.toString(),
          uniqueViews: uniqueViews.toString(),
          totalContactClicks: totalContactClicks.toString(),
          contactRate: contactRate.toString(),
          thisWeekViews: thisWeekViews.toString(),
          lastWeekViews: lastWeekViews.toString(),
          weeklyViewsDiff: weeklyViewsDiff.toString(),
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async changeListingStatus(_: any, { input }: any, context: any) {
      const { db, id, entity } = await checkAuth(context);
      const { action, reason, listingId } = input;

      try {
        const listing = await db.query.marketPlace.findFirst({
          where: (listing: any, { eq, and }: any) =>
            and(eq(listing.id, listingId), eq(listing.entityId, entity)),
        });

        if (!listing) {
          throw new GraphQLError("Listing not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        // Action → Status mapping
        const statusMap: Record<
          string,
          { status: string; isApproved: boolean }
        > = {
          APPROVE: { status: "APPROVED", isApproved: true },
          REAPPROVE: { status: "APPROVED", isApproved: true },
          ENABLE: { status: "APPROVED", isApproved: true },
          REJECT: { status: "REJECTED", isApproved: false },
          DISABLE: { status: "DISABLED", isApproved: false },
          PAUSE: { status: "PAUSED", isApproved: false },
        };

        const mapped = statusMap[action];
        if (!mapped) {
          throw new GraphQLError(`Unknown action: ${action}`, {
            extensions: { code: "BAD_USER_INPUT", http: { status: 400 } },
          });
        }

        await db.transaction(async (tx: any) => {
          await tx
            .update(marketPlace)
            .set({ status: mapped.status, isApproved: mapped.isApproved })
            .where(eq(marketPlace.id, listingId));

          await tx.insert(listingLogs).values({
            action: "STATUS",
            reason,
            listingId,
            performedBy: id,
            status: mapped.status,
            entity,
            previousState: listing.status,
          });
        });

        const updatedListing = await db.query.marketPlace.findFirst({
          where: (marketPlace: any, { eq }: any) =>
            eq(marketPlace.id, listingId),
          with: {
            media: true,
            verification: true,
          },
        });

        if (updatedListing && action === "APPROVE" && updatedListing.postedBy) {
          try {
            const { ListingNotificationPublisher } =
              await import("@thrico/services");
            await ListingNotificationPublisher.publishListingApproved({
              db,
              userId: updatedListing.postedBy,
              listingId: updatedListing.id,
              listing: updatedListing,
              entityId: entity,
            });
          } catch (notifError) {
            console.error("Failed to send approval notification:", notifError);
            // Don't fail the mutation if notification fails
          }
        }

        return updatedListing;
      } catch (error) {
        console.error("Failed to change status:", error);
        throw error;
      }
    },

    async changeListingVerification(_: any, { input }: any, context: any) {
      const { db, id, entity } = await checkAuth(context);
      const { action, reason, listingId } = input;

      try {
        // Fetch the listing and its verification record
        const listing = await db.query.marketPlace.findFirst({
          where: (listing: any, { eq, and }: any) =>
            and(eq(listing.id, listingId), eq(listing.entityId, entity)),
        });

        if (!listing) {
          throw new GraphQLError("Listing not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        const verification = await db.query.listingVerification.findFirst({
          where: (verification: any, { eq }: any) =>
            eq(verification.listingId, listingId),
        });

        if (!verification) {
          // Need to insert if not exists? Assuming it always exists on creation in addListing.
          // But if legacy data, might miss it. For now assume exists.
          throw new GraphQLError("Verification record not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        // Action → Verification mapping
        const verificationMap: Record<
          string,
          { isVerified: boolean; verificationReason: string }
        > = {
          VERIFY: {
            isVerified: true,
            verificationReason: reason || "Verified by admin",
          },
          UNVERIFY: {
            isVerified: false,
            verificationReason: reason || "Unverified by admin",
          },
        };

        const mapped = verificationMap[action];
        if (!mapped) {
          throw new GraphQLError(`Unknown action: ${action}`, {
            extensions: { code: "BAD_USER_INPUT", http: { status: 400 } },
          });
        }

        // Update verification record
        await db
          .update(listingVerification)
          .set({
            isVerified: mapped.isVerified,
            verificationReason: mapped.verificationReason,
            verifiedBy: id,
            isVerifiedAt: new Date(),
          })
          .where(eq(listingVerification.listingId, listingId));

        return db.query.marketPlace.findFirst({
          where: (l: any, { eq }: any) => eq(l.id, listingId),
          with: { verification: true, media: true },
        });
      } catch (error) {
        console.error("Failed to change verification:", error);
        throw error;
      }
    },
    async addListing(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        const entityResult = await entityClient.getEntityDetails(entity);

        // Check for duplicate title
        const duplicate = await db.query.marketPlace.findFirst({
          where: (listing: any, { eq, and }: any) =>
            and(eq(listing.entityId, entity), eq(listing.title, input.title)),
        });

        if (duplicate) {
          throw new GraphQLError("A listing with this title already exists.", {
            extensions: {
              code: "CONFLICT",
              http: { status: 409 },
            },
          });
        }

        const checkAutoApprove = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entity),
        });

        console.log("Input:", input);

        let media: any[] = [];
        if (input.media) {
          media = await uploadFeedImage(entity, input.media);
        }

        console.log("Uploaded Media:", media);

        const newListing = await db.transaction(async (tx: any) => {
          const [createdListing] = await tx
            .insert(marketPlace)
            .values({
              title: input.title,
              description: input.description,
              price: input.price,
              condition: input.condition,
              sku: input.sku,
              tag: input.tag,
              location: input.location,
              category: input.category,
              addedBy: "ENTITY",
              entityId: entity,
              isApproved: false,
              currency: entityResult.currency || "USD",
              status: checkAutoApprove?.autoApproveMarketPlace
                ? "APPROVED"
                : "PENDING",
              slug: input.title,
            })
            .returning();

          let medias: any[] = [];
          if (media.length > 0) {
            medias = media.map((set) => ({
              url: set.url,
              marketPlace: createdListing.id,
            }));

            await tx.insert(marketPlaceMedia).values(medias);
          }

          const [insertedVerification] = await tx
            .insert(listingVerification)
            .values({
              isVerifiedAt: new Date(),
              verifiedBy: id,
              isVerified: true,
              verificationReason: "Created by admin",
              listingId: createdListing.id,
            })
            .returning();

          await tx.insert(userFeed).values({
            entity,
            description: "New Job Added",
            marketPlaceId: createdListing.id,
            source: "marketPlace",
          });

          const data = {
            ...createdListing,
            media: medias,
            verification: insertedVerification,
          };
          return data;
        });

        return newListing;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async editListing(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        // Check if another listing with the same title exists for this entity (excluding current)
        const duplicate = await db.query.marketPlace.findFirst({
          where: (listing: any, { eq, and, ne }: any) =>
            and(
              eq(listing.entityId, entity),
              eq(listing.title, input.title),
              ne(listing.id, input.id),
            ),
        });

        if (duplicate) {
          throw new GraphQLError("A listing with this title already exists.", {
            extensions: {
              code: "CONFLICT",
              http: { status: 409 },
            },
          });
        }

        // Fetch the current listing for audit log
        const currentListing = await db.query.marketPlace.findFirst({
          where: (listing: any, { eq, and }: any) =>
            and(eq(listing.id, input.id), eq(listing.entityId, entity)),
        });

        if (!currentListing) {
          throw new GraphQLError("Listing not found", {
            extensions: {
              code: "NOT_FOUND",
              http: { status: 404 },
            },
          });
        }

        // Update the listing
        const [updatedListing] = await db
          .update(marketPlace)
          .set({
            ...input,
            slug: input.title,
          })
          .where(
            and(eq(marketPlace.id, input.id), eq(marketPlace.entityId, entity)),
          )
          .returning();

        // Add audit log
        await db.insert(listingLogs).values({
          reason: input.reason || "Listing edited",
          listingId: input.id,
          performedBy: id,
          status: "APPROVED",
          entity,
          previousState: currentListing, // JSON field
        });

        const finalResult = await db.query.marketPlace.findFirst({
          where: (l: any, { eq }: any) => eq(l.id, input.id),
          with: { media: true, verification: true },
        });

        return finalResult;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
  },
};

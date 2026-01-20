import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";
import { groupMember, groupMedia } from "@thrico/database";

export class CommunityMediaService {
  // Add Community Media (Admin/Manager only)
  static async addCommunityMedia({
    groupId,
    imageUrl,
    title,
    description,
    uploadedBy,
    entityId,
    db,
  }: {
    groupId: string;
    imageUrl: string;
    title: string;
    description?: string;
    uploadedBy: string;
    entityId: string;
    db: any;
  }) {
    try {
      // Check if user is admin or manager of the community
      const membership = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, uploadedBy),
          eq(groupMember.memberStatusEnum, "ACCEPTED"),
          inArray(groupMember.role, ["ADMIN", "MANAGER"])
        ),
      });

      if (!membership) {
        throw new GraphQLError(
          "Only community admins and managers can add media",
          { extensions: { code: "FORBIDDEN" } }
        );
      }

      // Get current highest display order
      const lastMedia = await db.query.groupMedia.findFirst({
        where: eq(groupMedia.groupId, groupId),
        orderBy: desc(groupMedia.displayOrder),
      });

      const displayOrder = lastMedia ? lastMedia.displayOrder + 1 : 1;

      const media = await db
        .insert(groupMedia)
        .values({
          groupId,
          imageUrl,
          title,
          description,
          uploadedBy,
          entityId,
          displayOrder,
        })
        .returning();

      return media[0];
    } catch (error) {
      log.error("Error in addCommunityMedia", {
        error,
        groupId,
        uploadedBy,
        title,
      });
      throw error;
    }
  }

  // Get Community Media
  static async getCommunityMedia({
    groupId,
    db,
    page = 1,
    limit = 20,
    includeInactive = false,
  }: {
    groupId: string;
    db: any;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }) {
    try {
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [eq(groupMedia.groupId, groupId)];
      if (!includeInactive) {
        conditions.push(eq(groupMedia.isActive, true));
      }

      // Get total count
      const [totalCountResult] = await db
        .select({ count: sql`count(*)` })
        .from(groupMedia)
        .where(and(...conditions));

      const totalCount = parseInt(totalCountResult?.count || "0");

      // Get paginated media
      const media = await db.query.groupMedia.findMany({
        where: and(...conditions),
        orderBy: [asc(groupMedia.displayOrder), desc(groupMedia.createdAt)],
        limit,
        offset,
        with: {
          uploader: {
            // Relation in schema is 'uploader: one(user, ...)'
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
            // Note: snippet used fullName, but user table usually has firstName/lastName.
            // Looking at user.ts, it has firstName, lastName. No fullName.
            // So I request firstName, lastName.
          },
        },
      });

      // Map uploader to have fullName if needed or just return as is.
      // Snippet expected fullName. I will add a transformation if possible or just return firstName/lastName
      const mediaWithFullName = media.map((m: any) => ({
        ...m,
        uploader: m.uploader
          ? {
              ...m.uploader,
              fullName: `${m.uploader.firstName} ${m.uploader.lastName}`,
            }
          : null,
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        media: mediaWithFullName,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      log.error("Error in getCommunityMedia", { error, groupId });
      throw error;
    }
  }

  // Additional media methods...
  // updateCommunityMedia, deleteCommunityMedia, reorderCommunityMedia
  // (Left out as per snippet, but I will validly close the class)
}

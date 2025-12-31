import { and, eq, inArray } from "drizzle-orm";
import { GraphQLError } from "graphql";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { userOrg } from "../../utils/common/userOrg";
import {
  communityLogs,
  communityVerification,
  groups,
  groupRequest,
} from "@thrico/database";
import generateSlug from "../../utils/slug.utils";
import uploadImageToFolder from "../../utils/upload/uploadImageToFolder.utils";

const approvalResolvers = {
  Query: {
    async getCommunities(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const { status } = input;
        console.log(status);
        if (status === "ALL") {
          const group = await db.query.groups.findMany({
            where: (groups: any, { eq }: any) => eq(groups.entity, entity),
            orderBy: (groups: any, { desc }: any) => [desc(groups.createdAt)],
            with: {
              verification: true,
            },
          });

          console.log(group);
          return group;
        } else {
          const group = await db.query.groups.findMany({
            where: (groups: any, { eq }: any) =>
              and(eq(groups.entity, entity), eq(groups.status, status)),
            orderBy: (groups: any, { desc }: any) => [desc(groups.createdAt)],
            with: {
              verification: true,
            },
          });
          return group;
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunityById(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { communityId } = input;

        const group = await db.query.groups.findFirst({
          where: (groups: any, { eq, and }: any) =>
            and(eq(groups.id, communityId), eq(groups.entity, entity)),
        });

        if (!group) {
          throw new GraphQLError("Community not found");
        }

        console.log(group);

        return group;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunityRequest(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { groupId } = input;

        // Validate input
        if (!groupId) {
          throw new GraphQLError("groupId is required");
        }

        // Ensure the group exists and belongs to the entity
        const group = await db.query.groups.findFirst({
          where: (groups: any, { eq, and }: any) =>
            and(eq(groups.id, groupId), eq(groups.entity, entity)),
        });

        if (!group) {
          return new GraphQLError("Community not found or access denied");
        }

        // Fetch pending requests for the group
        const requests = await db.query.groupRequest.findMany({
          where: (groupRequest: any, { eq, and }: any) =>
            and(
              eq(groupRequest.memberStatusEnum, "PENDING"),
              eq(groupRequest.groupId, groupId)
            ),
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
          orderBy: (groupRequest: any, { desc }: any) => [
            desc(groupRequest.createdAt),
          ],
        });

        return requests;
      } catch (error) {
        console.error("Failed to fetch community requests:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async changeDiscussionCommunityStatus(
      _: any,
      { input }: any,
      context: any
    ) {
      const { db, id, entity } = await checkAuth(context);
      const { action, reason, communityId } = input;

      try {
        const group = await db.query.groups.findFirst({
          where: (groups: any, { eq }: any) => eq(groups.id, communityId),
        });

        if (!group) {
          throw new Error("Community not found");
        }

        // Action → Status mapping
        const statusMap: Record<string, string> = {
          APPROVE: "APPROVED",
          REJECT: "REJECTED",
          DISABLE: "DISABLED",
          ENABLE: "APPROVED",
          PAUSE: "PAUSED",
          REAPPROVE: "APPROVED",
        };

        const newStatus = statusMap[input.action];
        if (!newStatus) {
          throw new Error(`Unknown action: ${input.action}`);
        }

        const groupData: Record<string, any> = { status: newStatus };
        if (
          input.action === "APPROVE" ||
          input.action === "ENABLE" ||
          input.action === "REAPPROVE"
        ) {
          groupData.isApproved = true;
        }
        if (
          input.action === "REJECT" ||
          input.action === "DISABLE" ||
          input.action === "PAUSE"
        ) {
          groupData.isApproved = false;
        }

        await db.transaction(async (tx: any) => {
          await tx
            .update(groups)
            .set(groupData)
            .where(eq(groups.id, communityId));

          // await tx.insert(communityLogs).values({
          //   community: communityId,
          //   performedBy: id,
          //   status: newStatus,
          //   entity,
          //   previousState: group.status,
          // });
        });

        const result = await db.query.groups.findFirst({
          where: (groups: any, { eq }: any) => eq(groups.id, communityId),
        });

        return result;
      } catch (error) {
        console.error("Failed to change status:", error);
        throw error;
      }
    },

    async changeDiscussionCommunityVerification(
      _: any,
      { input }: any,
      context: any
    ) {
      const { db, id, entity } = await checkAuth(context);
      const { action, reason, communityId } = input;

      console.log("action", action);
      try {
        const group = await db.query.groups.findFirst({
          where: (groups: any, { eq }: any) => eq(groups.id, communityId),
          with: {
            verification: true,
          },
        });
        if (!group) {
          throw new Error("Community not found");
        }
        if (action === "VERIFY") {
          await db.transaction(async (tx: any) => {
            await tx.insert(communityVerification).values({
              isVerifiedAt: new Date(),
              verifiedBy: id,
              isVerified: true,
              verificationReason: reason,
              community: group.id,
            });
            await tx.insert(communityLogs).values({
              communityId: communityId,
              performedBy: id,
              status: "APPROVED",
              entity,
              previousState: group.status,
              action,
            });
          });
        } else {
          await db
            .delete(communityVerification)
            .where(eq(communityVerification.community, group.id));
        }

        const result = await db.query.groups.findFirst({
          where: (groups: any, { eq }: any) => eq(groups.id, communityId),
          with: {
            verification: true,
          },
        });
        return result;
      } catch (error) {
        console.error("Failed to change status:", error);
        throw error;
      }
    },
    async addCommunity(_: any, { input }: any, context: any) {
      try {
        const { entity, db, id } = await checkAuth(context);

        // Handle cover upload if provided
        let cover = "communities-default-cover-photo.jpg";
        if (input?.cover?.file) {
          const uploaded = await uploadImageToFolder("communities", [
            input.cover.file,
          ]);
          if (uploaded && uploaded.length > 0) cover = uploaded[0].url;
        }

        // Prepare group data
        const groupData = {
          slug: generateSlug(input.title),
          title: input.title,
          addedBy: "ENTITY" as const,
          entity,
          cover,
          isApproved: true,
          groupType: input.groupType,
          joiningTerms: input.joiningTerms,
          privacy: input.privacy,
          description: input.description ?? "",
          // theme: input.theme, // Removed if theme is not in input, user code had 'input.theme' passed but removed from args? I will leave it
          theme: input.theme,
          interests: input.interests ?? [],
          categories: input.categories ?? [],
          tagline: input?.tagline,
          tag: input.tag ?? [],
          status: "APPROVED" as const,
          location: input.location ?? null,
          requireAdminApprovalForPosts: !!input.requireAdminApprovalForPosts,
          allowMemberInvites: input.allowMemberInvites !== false,
          enableEvents: input.enableEvents !== false,
          enableRatingsAndReviews: !!input.enableRatingsAndReviews,
        };

        // Insert the new group and verification in a transaction
        const result = await db.transaction(async (tx: any) => {
          const [insertedGroup] = await tx
            .insert(groups)
            .values(groupData)
            .returning();

          // Insert verification record
          const [insertedVerification] = await tx
            .insert(communityVerification)
            .values({
              isVerifiedAt: new Date(),
              verifiedBy: id,
              isVerified: true,
              verificationReason: "Created by admin",
              community: insertedGroup.id,
            })
            .returning();

          return { ...insertedGroup, verification: insertedVerification };
        });

        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateBasicInfo(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        // Check if the group exists
        const group = await db.query.groups.findFirst({
          where: (groups: any, { eq, and }: any) =>
            and(eq(groups.id, input.communityId), eq(groups.entity, entity)),
        });

        if (!group) {
          throw new GraphQLError("Community not found");
        }

        let cover = group?.cover;
        if (input?.cover?.file) {
          const uploaded = await uploadImageToFolder("communities", [
            input.cover.file,
          ]);
          if (uploaded && uploaded.length > 0) cover = uploaded[0].url;
        }

        // Update basic group info
        const [updatedGroup] = await db
          .update(groups)
          .set({
            title: input.title,
            description: input.description,
            cover: cover,
            privacy: input.privacy,
            communityType: input.communityType,
            joiningTerms: input.joiningTerms,
          })
          .where(
            and(eq(groups.id, input.communityId), eq(groups.entity, entity))
          )
          .returning();

        return updatedGroup;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async updateCommunityPermissions(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        // Update group permissions
        console.log(input);
        const [updatedGroup] = await db
          .update(groups)
          .set({
            allowMemberPosts: input.allowMemberPosts ?? false,
            requireAdminApprovalForPosts:
              input.requireAdminApprovalForPosts ?? false,
            allowMemberInvites: input.allowMemberInvites ?? false,
            enableEvents: input.enableEvents ?? false,
            enableRatingsAndReviews: input.enableRatingsAndReviews ?? false,
          })
          .where(
            and(eq(groups.id, input.communityId), eq(groups.entity, entity))
          )
          .returning();

        return updatedGroup;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async updateCommunityRules(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        // Update group rules
        const [updatedGroup] = await db
          .update(groups)
          .set({
            rules: input.rules,
          })
          .where(
            and(eq(groups.id, input.communityId), eq(groups.entity, entity))
          )
          .returning();

        return updatedGroup;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async addFeaturedGroup(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);
        const { db } = data;

        const userOrgId = await userOrg(data.id, db);

        console.log(input);

        if (input.length === 0) {
          return;
        }

        await db
          .update(groups)
          .set({ isFeatured: true })
          .where(inArray(groups.id, input));
        // Return logic is minimal in original code too
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { approvalResolvers };

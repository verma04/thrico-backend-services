import { DatabaseRegion } from "@thrico/shared";
import { MCPAction } from "../protocol";
import { getDb, userFeed, polls, pollOptions } from "@thrico/database";
import {
  RewardsService,
  UserService,
  CommunityService,
  JobService,
  ListingService,
  OfferService,
} from "@thrico/services";

export type ActionHandler = (
  data: any,
  entityId: string,
  region: DatabaseRegion,
  meta?: any,
) => Promise<any>;

// Action handlers registry
export const actionHandlers: Record<MCPAction, ActionHandler> = {
  create_feed: async (data, entityId, region, meta) => {
    const db = getDb(region);

    // Insert feed directly acting as the Entity itself (no userId needed)
    const [newFeed] = await db
      .insert(userFeed)
      .values({
        entity: entityId,
        description: data.content || data.description,
        addedBy: "ENTITY",
        privacy: data.privacy || "PUBLIC",
        status: data.status || "APPROVED",
        source: "dashboard",
        isAiContent: true,
      })
      .returning();

    return { status: "completed", feedId: newFeed.id };
  },

  create_poll: async (data, entityId, region, meta) => {
    const db = getDb(region);
    let feedId: string | undefined;

    await db.transaction(async (tx: any) => {
      // 1. Insert Poll as ENTITY
      const [newPoll] = await tx
        .insert(polls)
        .values({
          entityId,
          title: data.title,
          question: data.question || data.title,
          endDate: data.lastDate ? new Date(data.lastDate) : null,
          resultVisibility: data.resultVisibility || "ALWAYS",
          addedBy: "ENTITY",
        })
        .returning();

      // 2. Insert Poll Options
      if (Array.isArray(data.options) && data.options.length > 0) {
        await Promise.all(
          data.options.map((opt: string, idx: number) =>
            tx.insert(pollOptions).values({
              pollId: newPoll.id,
              text: opt,
              order: idx,
            }),
          ),
        );
      }

      // 3. Insert Feed linking to the Poll as ENTITY
      const [newFeed] = await tx
        .insert(userFeed)
        .values({
          entity: entityId,
          description: data.description,
          addedBy: "ENTITY",
          privacy: data.privacy || "PUBLIC",
          status: data.status || "APPROVED",
          source: "poll",
          isAiContent: true,
          pollId: newPoll.id,
        })
        .returning();

      feedId = newFeed.id;
    });

    return { status: "completed", feedId };
  },

  create_community: async (data, entityId, region, meta) => {
    const db = getDb(region);
    const userId = meta?.userId || entityId; // Use provided userId or fallback to entityId

    const result = await CommunityService.createCommunity({
      userId,
      entityId,
      db,
      input: {
        title: data.title,
        privacy: data.privacy || "PUBLIC",
        description: data.description,
        communityType: data.communityType || "VIRTUAL",
        tagline: data.tagline,
        location: data.location,
        categories: data.categories,
        interests: data.interests,
      },
    });

    return { status: "completed", communityId: result.id };
  },

  create_listing: async (data, entityId, region, meta) => {
    const db = getDb(region);
    const userId = meta?.userId || entityId;

    const result = await ListingService.createListing(
      db,
      entityId,
      userId,
      {
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency || "USD",
        condition: data.condition || "NEW",
        category: data.category,
        location: data.location,
      }
    );

    return { status: "completed", listingId: result?.id };
  },

  create_offer: async (data, entityId, region, meta) => {
    const db = getDb(region);
    const userId = meta?.userId || entityId;

    const result = await OfferService.createOffer({
      userId,
      entityId,
      db,
      input: {
        title: data.title,
        description: data.description,
        discountValue: data.discountValue,
        discountType: data.discountType || "PERCENTAGE",
        validityStart: data.validityStart,
        validityEnd: data.validityEnd,
        couponCode: data.couponCode,
      },
    });

    return { status: "completed", offerId: result.id };
  },
};

export const executeAction = async (
  action: MCPAction,
  data: any,
  entityId: string,
  region: DatabaseRegion = DatabaseRegion.IND,
  meta?: any,
): Promise<any> => {
  const handler = actionHandlers[action];
  if (!handler) {
    throw new Error(`No handler registered for action: ${action}`);
  }
  return await handler(data, entityId, region, meta);
};

import { AppDatabase, badges, pointRules, ranks } from "@thrico/database";
import { log } from "@thrico/logging";

/**
 * Default Gamification Config
 * This is the base gamification setup for every new entity
 */
export const DEFAULT_GAMIFICATION_CONFIG = {
  pointRules: [
    // Feed
    {
      module: "feed",
      action: "tr-feed-create",
      trigger: "RECURRING",
      points: 10,
      description: "Create a feed post",
      dailyCap: 100,
    },
    {
      module: "feed",
      action: "tr-feed-like",
      trigger: "RECURRING",
      points: 2,
      description: "Like a feed post",
      dailyCap: 50,
    },
    {
      module: "feed",
      action: "tr-feed-comment",
      trigger: "RECURRING",
      points: 5,
      description: "Comment on a feed post",
      dailyCap: 50,
    },

    // Communities
    {
      module: "communities",
      action: "tr-com-create",
      trigger: "FIRST_TIME",
      points: 50,
      description: "Create your first community",
    },
    {
      module: "communities",
      action: "tr-com-join",
      trigger: "RECURRING",
      points: 10,
      description: "Join a community",
      dailyCap: 30,
    },

    // Events
    {
      module: "events",
      action: "tr-evt-create",
      trigger: "RECURRING",
      points: 30,
      description: "Create an event",
      weeklyCap: 100,
    },
    {
      module: "events",
      action: "tr-evt-join",
      trigger: "RECURRING",
      points: 15,
      description: "Join an event",
      dailyCap: 50,
    },

    // Jobs
    {
      module: "jobs",
      action: "tr-job-create",
      trigger: "RECURRING",
      points: 10,
      description: "Apply for a job",
      dailyCap: 20,
    },
    {
      module: "jobs",
      action: "tr-job-share",
      trigger: "RECURRING",
      points: 10,
      description: "Share a job",
      dailyCap: 50,
    },

    // Stories
    {
      module: "stories",
      action: "tr-story-create",
      trigger: "RECURRING",
      points: 15,
      description: "Post a story",
      dailyCap: 45,
    },

    // Celebrations
    {
      module: "celebrate",
      action: "tr-cel-add",
      trigger: "RECURRING",
      points: 20,
      description: "Post a celebration",
      dailyCap: 60,
    },

    // Forums
    {
      module: "forums",
      action: "tr-forum-add",
      trigger: "RECURRING",
      points: 30,
      description: "Start a forum discussion",
      dailyCap: 90,
    },
    {
      module: "forums",
      action: "tr-forum-comment",
      trigger: "RECURRING",
      points: 5,
      description: "Comment on a forum",
      dailyCap: 50,
    },

    // Marketplace
    {
      module: "listing",
      action: "tr-list-create",
      trigger: "RECURRING",
      points: 25,
      description: "Create a listing",
      dailyCap: 75,
    },
    {
      module: "listing",
      action: "tr-list-contact",
      trigger: "RECURRING",
      points: 5,
      description: "Contact a seller",
      dailyCap: 25,
    },

    // Network
    {
      module: "network",
      action: "tr-net-send",
      trigger: "RECURRING",
      points: 5,
      description: "Send connection request",
      dailyCap: 50,
    },
    {
      module: "network",
      action: "tr-net-accept",
      trigger: "RECURRING",
      points: 10,
      description: "Accept connection request",
      dailyCap: 50,
    },

    // Polls
    {
      module: "polls",
      action: "tr-poll-create",
      trigger: "RECURRING",
      points: 20,
      description: "Create a poll",
      dailyCap: 40,
    },
    {
      module: "polls",
      action: "tr-poll-vote",
      trigger: "RECURRING",
      points: 3,
      description: "Vote on a poll",
      dailyCap: 30,
    },
  ],

  badges: [
    // Action badges
    {
      name: "First Post",
      type: "ACTION",
      module: "feed",
      action: "tr-feed-create",
      targetValue: 1,
      icon: "🎉",
      description: "Create your first post",
      condition: "Post your first feed",
    },
    {
      name: "Conversation Starter",
      type: "ACTION",
      module: "feed",
      action: "tr-feed-comment",
      targetValue: 10,
      icon: "💬",
      description: "Comment on 10 posts",
      condition: "Post 10 feed comments",
    },
    {
      name: "Community Builder",
      type: "ACTION",
      module: "communities",
      action: "tr-com-create",
      targetValue: 1,
      icon: "🏗️",
      description: "Create your first community",
      condition: "Create your first community",
    },
    {
      name: "Event Organizer",
      type: "ACTION",
      module: "events",
      action: "tr-evt-create",
      targetValue: 5,
      icon: "📅",
      description: "Create 5 events",
      condition: "Create 5 events",
    },
    {
      name: "Storyteller",
      type: "ACTION",
      module: "stories",
      action: "tr-story-create",
      targetValue: 5,
      icon: "📸",
      description: "Post 5 stories",
      condition: "Share 5 stories",
    },
    {
      name: "Pollster",
      type: "ACTION",
      module: "polls",
      action: "tr-poll-create",
      targetValue: 3,
      icon: "📊",
      description: "Create 3 polls",
      condition: "Launch 3 polls",
    },
    {
      name: "Marketplace Guru",
      type: "ACTION",
      module: "listing",
      action: "tr-list-create",
      targetValue: 5,
      icon: "🛒",
      description: "Create 5 listings",
      condition: "List 5 items in marketplace",
    },
    {
      name: "Bridge Builder",
      type: "ACTION",
      module: "network",
      action: "tr-net-accept",
      targetValue: 10,
      icon: "🤝",
      description: "Connect with 10 people",
      condition: "Accept 10 connection requests",
    },

    // Points badges
    {
      name: "Rising Star",
      type: "POINTS",
      targetValue: 500,
      icon: "⭐",
      description: "Earn 500 points",
      condition: "Reach 500 total points",
    },
    {
      name: "Champion",
      type: "POINTS",
      targetValue: 2000,
      icon: "🏆",
      description: "Earn 2000 points",
      condition: "Reach 2000 total points",
    },
    {
      name: "Master",
      type: "POINTS",
      targetValue: 5000,
      icon: "🎖️",
      description: "Earn 5000 points",
      condition: "Reach 5000 total points",
    },
    {
      name: "Grandmaster",
      type: "POINTS",
      targetValue: 10000,
      icon: "🔱",
      description: "Earn 10000 points",
      condition: "Reach 10000 total points",
    },
  ],

  ranks: [
    {
      name: "Newbie",
      minPoints: 0,
      maxPoints: 199,
      color: "#94a3b8",
      icon: "🐣",
      order: 1,
    },
    {
      name: "Explorer",
      minPoints: 200,
      maxPoints: 999,
      color: "#38bdf8",
      icon: "🧭",
      order: 2,
    },
    {
      name: "Pro",
      minPoints: 1000,
      maxPoints: 2999,
      color: "#22c55e",
      icon: "🚀",
      order: 3,
    },
    {
      name: "Legend",
      minPoints: 3000,
      maxPoints: null,
      color: "#f59e0b",
      icon: "👑",
      order: 4,
    },
  ],
} as const;

/**
 * Seeder Function
 */
export async function seedDefaultGamification(
  db: AppDatabase,
  entityId: string,
) {
  // Insert Point Rules
  await db
    .insert(pointRules)
    .values(
      DEFAULT_GAMIFICATION_CONFIG.pointRules.map((rule) => ({
        ...rule,
        entityId,
        isActive: true,
      })),
    )
    .onConflictDoNothing();

  // Insert Badges
  await db
    .insert(badges)
    .values(
      DEFAULT_GAMIFICATION_CONFIG.badges.map((badge) => ({
        ...badge,
        entityId,
        isActive: true,
      })),
    )
    .onConflictDoNothing();

  // Check if ranks exist
  const existingRanks = await db.query.ranks.findFirst({
    where: (ranks, { eq }) => eq(ranks.entityId, entityId),
  });

  if (!existingRanks) {
    // Insert Ranks
    await db.insert(ranks).values(
      DEFAULT_GAMIFICATION_CONFIG.ranks.map((rank) => ({
        ...rank,
        entityId,
        isActive: true,
      })),
    );
  }

  log.info("✅ Default gamification setup completed");
}

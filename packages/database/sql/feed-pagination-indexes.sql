-- =============================================================================
-- Feed Pagination Indexes (CRITICAL for 2-step architecture performance)
-- =============================================================================
-- These indexes support the refactored cursor-based pagination that orders by
-- (created_at DESC, id DESC). Without them, queries will fall back to seq scans.
-- =============================================================================

-- Index for getMyFeed / getUserFeed: user's own feed, filtered by entity + no group
CREATE INDEX IF NOT EXISTS idx_userfeed_user_entity_created_id
ON "userFeed" (user_id, org_id, created_at DESC, id DESC)
WHERE group_id IS NULL;

-- Index for getCommunitiesFeedList: community feed, filtered by group + entity
CREATE INDEX IF NOT EXISTS idx_userfeed_group_entity_created_id
ON "userFeed" (group_id, org_id, created_at DESC, id DESC);

-- Index for getFeedActivityByUserId: specific user's posts in an entity
CREATE INDEX IF NOT EXISTS idx_userfeed_userid_entity_created_id
ON "userFeed" (user_id, org_id, created_at DESC, id DESC);

-- Index for getUserFeed (entity-wide, no group): all posts in entity
CREATE INDEX IF NOT EXISTS idx_userfeed_entity_created_id
ON "userFeed" (org_id, created_at DESC, id DESC)
WHERE group_id IS NULL;

-- Index for pinned feeds (sorted by pinned_at)
CREATE INDEX IF NOT EXISTS idx_userfeed_pinned
ON "userFeed" (user_id, org_id, pinned_at DESC)
WHERE is_pinned = true AND group_id IS NULL;

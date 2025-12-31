DO $$ BEGIN
 CREATE TYPE "entityCountryEnum" AS ENUM('IND', 'USA', 'UAE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "pagesEnum" AS ENUM('WORDPRESS', 'HTML');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "paymentsType" AS ENUM('events', 'mentorship');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "paymentMerchant" AS ENUM('razorpay', 'stripe');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "paymentStatus " AS ENUM('refunded', 'captured', 'Failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "eventCostTypeEnum" AS ENUM('FREE', 'PAID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "eventTeamRole" AS ENUM('ORGANIZER', 'CO_ORGANIZER', 'VOLUNTEER', 'SPEAKER_MANAGER', 'LOGISTICS', 'MARKETING', 'TECH_SUPPORT', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "eventTypes" AS ENUM('VIRTUAL', 'IN_PERSON', 'HYBRID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "hostType" AS ENUM('HOST', 'CO_HOST');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "layout" AS ENUM('layout-1', 'layout-2', 'layout-3');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "mediaType" AS ENUM('VIDEO', 'IMAGE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "eventVisibility" AS ENUM('PRIVATE', 'PUBLIC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communityActivityStatusEnum" AS ENUM('NEW', 'APPROVED', 'REJECTED', 'UPDATED', 'DELETED', 'LEFT', 'REMOVED', 'CREATED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communityActivityTypeEnum" AS ENUM('RATING', 'EVENT', 'MEMBER', 'MEDIA', 'WISHLIST', 'GENERAL', 'MEMBER_EVENT', 'RATING_EVENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communityReportReasonEnum" AS ENUM('INAPPROPRIATE_CONTENT', 'SPAM', 'HARASSMENT', 'FAKE_COMMUNITY', 'VIOLENCE', 'HATE_SPEECH', 'SCAM_FRAUD', 'COPYRIGHT_VIOLATION', 'MISINFORMATION', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "feedPriorityEnum" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "feedStatusEnum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'REMOVED', 'FLAGGED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "interactionTypeEnum" AS ENUM('LIKE', 'SHARE', 'BOOKMARK', 'REACTION', 'COMMENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "managerRole" AS ENUM('ADMIN', 'MANAGER', 'USER', 'NOT_MEMBER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "memberStatusEnum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "moderationActionEnum" AS ENUM('NO_ACTION', 'WARNING_ISSUED', 'CONTENT_REMOVED', 'COMMUNITY_SUSPENDED', 'COMMUNITY_BANNED', 'OWNER_CHANGED', 'RESTRICTIONS_APPLIED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notificationStatusEnum" AS ENUM('UNREAD', 'READ', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notificationTypeEnum" AS ENUM('COMMUNITY_EVENT', 'MEMBER_EVENT', 'ADMIN_EVENT', 'SYSTEM_EVENT', 'RATING_EVENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "ratingEnum" AS ENUM('1', '2', '3', '4', '5');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "reportAuditActionEnum" AS ENUM('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'REVIEWED', 'ACTION_TAKEN', 'RESOLVED', 'APPEALED', 'APPEAL_REVIEWED', 'ESCALATED', 'NOTES_ADDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "userAddedForm" AS ENUM('invite', 'direct');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "feedPostedOn" AS ENUM('community');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "feedPrivacy" AS ENUM('CONNECTIONS', 'PUBLIC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "reactionsType" AS ENUM('like', 'celebrate', 'support', 'love', 'insightful', 'funny');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "source" AS ENUM('dashboard', 'group', 'event', 'jobs', 'marketPlace', 'rePost', 'story', 'admin', 'xf', 'poll', 'offer', 'celebration', 'forum');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "userFeedPriority" AS ENUM('URGENT', 'HIGH', 'NORMAL', 'LOW');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "userFeedStatusEnum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'REMOVED', 'FLAGGED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "feedBackType" AS ENUM('event', 'group', 'jobs');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "questionType" AS ENUM('multipleChoice', 'shortText');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "jobExperienceLevel" AS ENUM('ENTRY-LEVEL', 'MID-LEVEL', 'SENIOR', 'LEAD', 'EXECUTIVE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "jobReportReason" AS ENUM('SPAM', 'INAPPROPRIATE', 'SCAM', 'MISLEADING', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "jobReportStatus" AS ENUM('PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "jobTypes" AS ENUM('FULL-TIME', 'PART-TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'VOLUNTEER', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "workplaceTypes" AS ENUM('ON-SITE', 'HYBRID', 'REMOTE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "listingConditionEnums" AS ENUM('NEW', 'USED_LIKE_NEW', 'USED_LIKE_GOOD', 'USED_LIKE_FAIR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "associationType" AS ENUM('Business School', 'College', 'University', 'School', 'Other', 'Others');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "challengesMode" AS ENUM('online', 'offline');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "challengesParticipationType" AS ENUM('individual', 'team');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "challengesVisibility" AS ENUM('public', 'private');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "mentorServicesType" AS ENUM('1:1 call', 'subscription', 'webinar');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "mentorStatus" AS ENUM('APPROVED', 'BLOCKED', 'PENDING', 'REJECTED', 'REQUESTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "mentorShipRequestStatus" AS ENUM('ACCEPTED', 'REJECTED', 'CANCEL', 'PENDING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "servicesPriceType" AS ENUM('free', 'paid');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "CampaignType" AS ENUM('specific', 'open');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "module" AS ENUM('event', 'communities', 'jobs');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "connectionStatusEnum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "messageTypeEnum" AS ENUM('message', 'marketPlace');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notificationType" AS ENUM('FEED_COMMENT', 'FEED_LIKE', 'NETWORK', 'COMMUNITIES', 'LISTING_LIKE', 'JOB_LIKE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "highlightsType" AS ENUM('STORIES', 'ANNOUNCEMENT', 'EVENTS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "discussionForumStatus" AS ENUM('APPROVED', 'PENDING', 'REJECTED', 'DISABLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "discussionVoteType" AS ENUM('UPVOTE', 'DOWNVOTE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "pollResultVisibilityType" AS ENUM('ALWAYS', 'AFTER_VOTE', 'AFTER_END', 'ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "pollsStatus" AS ENUM('APPROVED', 'DISABLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "customFormFieldType" AS ENUM('SHORT_TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'WEBSITE', 'NUMBER', 'OPINION_SCALE', 'RATING', 'MULTIPLE_CHOICE', 'ISOPTION', 'DROPDOWN', 'DATE', 'TIME', 'YES-NO', 'LEGAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "customFormPreviewTypes" AS ENUM('MULTI_STEP', 'SCROLL_LONG');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "customFormResultVisibilityType" AS ENUM('ALWAYS', 'AFTER_SUBMIT', 'AFTER_END', 'ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "customFormStatus" AS ENUM('APPROVED', 'DISABLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "addedBy" AS ENUM('USER', 'ENTITY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communityEntityStatus" AS ENUM('APPROVED', 'BLOCKED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communityTypeEnum" AS ENUM('VIRTUAL', 'HYBRID', 'INPERSON');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "device_OStype" AS ENUM('ANDROID', 'IOS', 'WEB');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "gender" AS ENUM('male', 'female', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "joiningTerms" AS ENUM('ANYONE_CAN_JOIN', 'ADMIN_ONLY_ADD');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "logAction" AS ENUM('STATUS', 'ADD', 'REMOVE', 'UPDATE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "logStatus" AS ENUM('STATUS', 'ADD', 'REMOVE', 'UPDATE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "enumLogType" AS ENUM('APPROVE', 'BLOCK', 'DISABLE', 'ENABLE', 'UNBLOCK', 'REJECT', 'FLAG', 'VERIFY', 'UNVERIFY', 'REAPPROVE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "loginType" AS ENUM('EMAIL', 'GOOGLE', 'LINKEDIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communityPrivacy" AS ENUM('PRIVATE', 'PUBLIC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "reportStatus" AS ENUM('PENDING', 'RESOLVED', 'DISMISSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "userStatus" AS ENUM('APPROVED', 'BLOCKED', 'PENDING', 'REJECTED', 'FLAGGED', 'DISABLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "userPronounsStatus" AS ENUM('they/them', 'she/her', 'he/him', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "badge_type" AS ENUM('ACTION', 'POINTS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "points_ddssdmodule" AS ENUM('FEED', 'LISTING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "rank_type" AS ENUM('POINTS', 'BADGES', 'HYBRID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "trigger_type" AS ENUM('FIRST_TIME', 'RECURRING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_action_gamification" AS ENUM('LIKE_FEED', 'POST_FEED', 'COMMENT_FEED', 'SHARE_FEED', 'POST_LISTING', 'SHARE_LISTING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "celebration_type" AS ENUM('project_launch', 'work_anniversary', 'new_position', 'educational_milestone', 'new_certification', 'achievement', 'promotion', 'graduation');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "reportModule" AS ENUM('FEED', 'MEMBER', 'DISCUSSION_FORUM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "admin_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profileInfo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"metadata" jsonb,
	"designation" text NOT NULL,
	"phone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"otp" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"timeOfExpire" integer DEFAULT 10,
	"isExpired" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"ip" text,
	"deviceOs" text,
	"deviceId" uuid DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"ipAddress" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"logout" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "currency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cc" text NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"entityType" text NOT NULL,
	"name" text NOT NULL,
	"timeZone" text NOT NULL,
	"logo" text NOT NULL,
	"website" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"user_id" uuid,
	"favicon" text,
	"color" text,
	"currency_id" uuid,
	"country" "entityCountryEnum" DEFAULT 'IND' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "theme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"colorPrimary" text DEFAULT '#0972cc' NOT NULL,
	"borderRadius" text DEFAULT '2' NOT NULL,
	"colorBgContainer" text DEFAULT '#ffffff' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entity_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "razorpay" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_id" text,
	"key_secret" text,
	"entity_id" uuid NOT NULL,
	"isEnabled" boolean DEFAULT false,
	CONSTRAINT "razorpay_key_id_unique" UNIQUE("key_id"),
	CONSTRAINT "razorpay_key_secret_unique" UNIQUE("key_secret")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stripe " (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_id" text,
	"key_secret" text,
	"entity_id" uuid NOT NULL,
	"isEnabled" boolean DEFAULT false,
	CONSTRAINT "stripe _key_id_unique" UNIQUE("key_id"),
	CONSTRAINT "stripe _key_secret_unique" UNIQUE("key_secret")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orgSocialMedia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"twitter" text,
	"linkedin" text,
	"instagram" text,
	"youtube" text,
	"entity_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "headerLinks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"link" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"sort" integer NOT NULL,
	"subMenu" json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customDomain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" text NOT NULL,
	"dnsConfig" boolean DEFAULT false NOT NULL,
	"ssl" boolean DEFAULT false NOT NULL,
	"status" boolean DEFAULT false NOT NULL,
	"entity_id" uuid NOT NULL,
	CONSTRAINT "customDomain_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entitySettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autoApproveUser" boolean DEFAULT true,
	"autoApproveGroup" boolean DEFAULT true,
	"autoApproveEvents" boolean DEFAULT true,
	"autoApproveDiscussionForum" boolean DEFAULT true,
	"autoApproveJobs" boolean DEFAULT true,
	"autoApproveCommunity" boolean DEFAULT true,
	"autoApproveMarketPlace" boolean DEFAULT true,
	"entity_id" uuid NOT NULL,
	"allowNewUser" boolean DEFAULT true,
	"allowNewDiscussionForum" boolean DEFAULT true,
	"allowCommunity" boolean DEFAULT true,
	"termAndConditionsMembers" jsonb,
	"termAndConditionsCommunities" jsonb,
	"termAndDiscussionForums" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entityTag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entitySettingsUserApprovals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autoApprove" boolean DEFAULT false,
	"entity_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entityDomain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entity" uuid,
	CONSTRAINT "entityDomain_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_social_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"url" text NOT NULL,
	"entity_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_navbar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"items" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_footer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"footer" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "websiteType" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pageType" "pagesEnum" NOT NULL,
	"entity_id" uuid,
	"isReady" boolean DEFAULT false,
	"userName" text,
	"password" text,
	"url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staticPages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_id" uuid NOT NULL,
	"content" text,
	"meta_title" varchar(255),
	"meta_description" varchar(500),
	"meta_keywords" varchar(500),
	"canonical_url" varchar(500),
	"og_title" varchar(255),
	"og_description" varchar(500),
	"og_image" varchar(500),
	"twitter_title" varchar(255),
	"twitter_description" varchar(500),
	"twitter_image" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"isPublished" boolean DEFAULT false,
	"slug" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "websites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"theme" text DEFAULT 'academia',
	"font" text DEFAULT 'inter',
	"is_published" boolean DEFAULT false,
	"custom_domain" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "navbars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"layout" text DEFAULT 'simple',
	"is_enabled" boolean DEFAULT true,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"name" varchar(255) DEFAULT 'navbar' NOT NULL,
	"type" varchar(255) DEFAULT 'navbar' NOT NULL,
	CONSTRAINT "navbars_website_id_unique" UNIQUE("website_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "footers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"layout" text DEFAULT 'columns',
	"is_enabled" boolean DEFAULT true,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"name" varchar(255) DEFAULT 'footer' NOT NULL,
	"type" varchar(255) DEFAULT 'footer' NOT NULL,
	CONSTRAINT "footers_website_id_unique" UNIQUE("website_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"layout" text NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"is_customized" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"visibility" text DEFAULT 'public' NOT NULL,
	"includeInSitemap" boolean DEFAULT true,
	"seo" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentStatus" "paymentStatus " NOT NULL,
	"paymentsType" "paymentsType" NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"razorpay_signature" text,
	"razorpay_refund_id" text,
	"isRefund" boolean DEFAULT false NOT NULL,
	"refundGeneratedAt" timestamp,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"currencySymbol" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userAuditLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userToEntityId" uuid NOT NULL,
	"actonEnum" "enumLogType",
	"logStatus" "logStatus",
	"performedBy" uuid NOT NULL,
	"reason" text,
	"previousState" jsonb,
	"newState" jsonb,
	"created_at" timestamp DEFAULT now(),
	"entity" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aboutUser" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currentPosition" varchar(200),
	"user_ID" uuid NOT NULL,
	"userPronounsStatus" "userPronounsStatus",
	"social" json,
	"headline" varchar,
	"about" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "thricoUser" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thricoId" uuid NOT NULL,
	"firstName" text NOT NULL,
	"cover" text DEFAULT 'default_profile_cover.jpg',
	"avatar" text DEFAULT 'defaultAvatar.png',
	"lastName" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entity_id" uuid NOT NULL,
	"payload" jsonb,
	"isBlocked" boolean DEFAULT false,
	"isActive" boolean DEFAULT true,
	"loginType" text,
	CONSTRAINT "thricoUser_thricoId_entity_id_unique" UNIQUE("thricoId","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userConnection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"followers_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"isAccepted" boolean NOT NULL,
	CONSTRAINT "userConnection_user_id_followers_id_unique" UNIQUE("user_id","followers_id"),
	CONSTRAINT "userConnection" UNIQUE("user_id","followers_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userKycs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affliction" json,
	"referralSource" json,
	"comment" json NOT NULL,
	"agreement" boolean NOT NULL,
	"entityId" uuid,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userLoction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"user_ID" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userOtp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"otp" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"timeOfExpire" integer DEFAULT 10,
	"isExpired" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userProfiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country" text,
	"designation" text,
	"DOB" text,
	"user_ID" uuid NOT NULL,
	"experience" json,
	"education" json,
	"phone" json,
	"phoneCode" text,
	"gendeR" "gender",
	"pronouns" "userPronounsStatus",
	"categories" json,
	"skills" json,
	"interests" json,
	"socialLinks" json,
	"interestCategories" json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userConnectionRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"isAccepted" boolean NOT NULL,
	CONSTRAINT "userConnectionRequest_user_id_sender_id_unique" UNIQUE("user_id","sender_id"),
	CONSTRAINT "userRequest" UNIQUE("user_id","sender_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userResume" (
	"currentPosition" text,
	"user_ID" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"device_name" varchar(255),
	"device_token" varchar(255),
	"last_used" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userToEntity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"isApproved" boolean DEFAULT false NOT NULL,
	"isRequested" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"tag" text[],
	"status" "userStatus" DEFAULT 'PENDING' NOT NULL,
	"interests" text[],
	"categories" text[],
	"last_active" timestamp with time zone,
	"isOnline" boolean DEFAULT false NOT NULL,
	CONSTRAINT "userToEntity_user_id_entity_id_unique" UNIQUE("user_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userVerification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isVerifiedAt" timestamp,
	"verifiedBy" uuid,
	"isVerified" boolean DEFAULT false,
	"verificationReason" text,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"offensive_content" text,
	"offensiveContentJson" json,
	"created_at" text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventHosts" (
	"user_id" uuid NOT NULL,
	"event_Id" uuid NOT NULL,
	"hostType" "hostType" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entity_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventAuditLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventId" uuid NOT NULL,
	"logStatus" "communityEntityStatus",
	"performedBy" uuid NOT NULL,
	"reason" text,
	"previousState" jsonb,
	"newState" jsonb,
	"created_at" timestamp DEFAULT now(),
	"entity" uuid NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventSpeakers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"bio" text,
	"title" varchar(255),
	"company" varchar(255),
	"avatar" text,
	"social_links" jsonb,
	"is_featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"status" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventSponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsorName" text NOT NULL,
	"sponsorLogo" text NOT NULL,
	"sponsorUserName" text NOT NULL,
	"isApproved" boolean NOT NULL,
	"sponsorUserDesignation" text NOT NULL,
	"event_Id" uuid NOT NULL,
	"sponsorship_Id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventTeams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "eventTeamRole" NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventsVerification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isVerifiedAt" timestamp,
	"verifiedBy" uuid,
	"isVerified" boolean DEFAULT false,
	"verificationReason" text,
	"eventId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventsss" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventCreator_id" uuid,
	"addedBy" "addedBy" DEFAULT 'USER',
	"entityId" uuid NOT NULL,
	"cover" text DEFAULT 'defaultEventCover.png' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"type" "eventTypes" NOT NULL,
	"status" "communityEntityStatus" NOT NULL,
	"venue" text,
	"location" jsonb,
	"lastDateOfRegistration" date NOT NULL,
	"startDate" date NOT NULL,
	"endDate" date NOT NULL,
	"startTime" text NOT NULL,
	"visibility" "eventVisibility" DEFAULT 'PUBLIC' NOT NULL,
	"description" text,
	"isAcceptingSponsorShip" boolean DEFAULT false NOT NULL,
	"isApproved" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT false NOT NULL,
	"groupId" uuid,
	"details" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"tag" text[],
	"isFeatured" boolean DEFAULT false NOT NULL,
	"numberOfLikes" integer DEFAULT 0,
	"numberOfPost" integer DEFAULT 0,
	"numberOfViews" integer DEFAULT 0,
	"isRegistrationOpen" boolean DEFAULT true NOT NULL,
	"embedding" "vector(1536)",
	CONSTRAINT "eventsss_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventsAgenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"videoSteam" text,
	"venue_id" text,
	"date" date NOT NULL,
	"startTime" time NOT NULL,
	"endTime" time NOT NULL,
	"isPublished" boolean NOT NULL,
	"isPinned" boolean NOT NULL,
	"isDraft" boolean NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"eventId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventsAttendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"eventId_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "eventsAttendees_user_id_eventId_id_unique" UNIQUE("user_id","eventId_id"),
	CONSTRAINT "uniqueEventsAttendees" UNIQUE("user_id","eventId_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventsMedia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text,
	"mediaType" "mediaType",
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"eventId" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventsOrganizer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_Id" uuid NOT NULL,
	"eventsOrganizerName" text,
	"contactEmail" text NOT NULL,
	"contactNumber" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventsPayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_Id" uuid NOT NULL,
	"eventCostTypeEnum" "eventCostTypeEnum" NOT NULL,
	"forAdults" numeric,
	"forChildren" numeric,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventsSettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_Id" uuid NOT NULL,
	"layout" "layout" DEFAULT 'layout-1' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "speakers_to_agenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventsSponsorShip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventId" uuid,
	"sponsorType" text NOT NULL,
	"price" numeric NOT NULL,
	"currency" text NOT NULL,
	"showPrice" boolean DEFAULT false NOT NULL,
	"content" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eventsVenue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100),
	"country" varchar(100) NOT NULL,
	"zip_code" varchar(20),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"capacity" integer,
	"description" text,
	"amenities" jsonb,
	"contact_info" jsonb,
	"images" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"status" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityActivityLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "communityActivityTypeEnum" NOT NULL,
	"status" "communityActivityStatusEnum" DEFAULT 'NEW' NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityFeed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_feed_id" uuid NOT NULL,
	"user_member" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"status" "feedStatusEnum" DEFAULT 'PENDING' NOT NULL,
	"isApproved" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejection_reason" text,
	"priority" "feedPriorityEnum" DEFAULT 'NORMAL' NOT NULL,
	"isPinned" boolean DEFAULT false NOT NULL,
	"pinned_by" uuid,
	"pinned_at" timestamp,
	"isFlagged" boolean DEFAULT false NOT NULL,
	"flagged_by" uuid,
	"flagged_at" timestamp,
	"flag_reason" text,
	"moderated_by" uuid,
	"moderated_at" timestamp,
	"scheduled_for" timestamp,
	"published_at" timestamp,
	"expires_at" timestamp,
	"tags" text[],
	"metadata" jsonb,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"archivedAt" timestamp,
	"archivedBy" uuid,
	"archivedReason" text,
	CONSTRAINT "communityFeed_user_feed_id_community_id_unique" UNIQUE("user_feed_id","community_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityFeedInteraction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "interactionTypeEnum" NOT NULL,
	"reaction_type" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "communityFeedInteraction_feed_id_user_id_type_unique" UNIQUE("feed_id","user_id","type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityFeedReport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "communityFeedReport_feed_id_reporter_id_unique" UNIQUE("feed_id","reporter_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityAuditLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communityId" uuid NOT NULL,
	"logStatus" "communityEntityStatus",
	"performedBy" uuid NOT NULL,
	"reason" text,
	"previousState" jsonb,
	"newState" jsonb,
	"created_at" timestamp DEFAULT now(),
	"entity" uuid NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"action" "logAction"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityNotification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid,
	"type" "notificationTypeEnum" NOT NULL,
	"title" text,
	"message" text NOT NULL,
	"status" "notificationStatusEnum" DEFAULT 'UNREAD' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entity_id" uuid,
	"actionUrl" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityReport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"reason" "communityReportReasonEnum" NOT NULL,
	"description" text,
	"evidence_urls" text[],
	"status" "reportStatus" DEFAULT 'PENDING' NOT NULL,
	"priority" "feedPriorityEnum" DEFAULT 'NORMAL' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"moderator_notes" text,
	"moderation_action" "moderationActionEnum" DEFAULT 'NO_ACTION',
	"action_taken_at" timestamp,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolution_notes" text,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"can_appeal" boolean DEFAULT true NOT NULL,
	"appeal_deadline" timestamp,
	"is_appealed" boolean DEFAULT false NOT NULL,
	"appealed_at" timestamp,
	"report_source" text DEFAULT 'USER',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "communityReport_reporter_id_community_id_entity_id_unique" UNIQUE("reporter_id","community_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityReportAppeal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"appealed_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"description" text NOT NULL,
	"evidence_urls" text[],
	"status" "reportStatus" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"reviewer_notes" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"final_decision" text,
	"decided_by" uuid,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "communityReportAppeal_report_id_unique" UNIQUE("report_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityReportAuditLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"performed_by" uuid NOT NULL,
	"action" "reportAuditActionEnum" NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"notes" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityReportStats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"total_reports" integer DEFAULT 0,
	"pending_reports" integer DEFAULT 0,
	"under_review_reports" integer DEFAULT 0,
	"approved_reports" integer DEFAULT 0,
	"rejected_reports" integer DEFAULT 0,
	"dismissed_reports" integer DEFAULT 0,
	"inappropriate_content_reports" integer DEFAULT 0,
	"spam_reports" integer DEFAULT 0,
	"harassment_reports" integer DEFAULT 0,
	"fake_community_reports" integer DEFAULT 0,
	"violence_reports" integer DEFAULT 0,
	"hate_speech_reports" integer DEFAULT 0,
	"other_reports" integer DEFAULT 0,
	"avg_resolution_time_hours" integer DEFAULT 0,
	"total_appeals" integer DEFAULT 0,
	"successful_appeals" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "communityReportStats_entity_id_unique" UNIQUE("entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communitySettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityVerification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isVerifiedAt" timestamp,
	"verifiedBy" uuid,
	"isVerified" boolean DEFAULT false,
	"verificationReason" text,
	"communityIdd" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityWishlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entity_id" uuid NOT NULL,
	"notes" text,
	"priority" integer DEFAULT 1,
	"notificationEnabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "communityWishlist_user_id_community_id_entity_id_unique" UNIQUE("user_id","community_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityInterests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"org_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityInvitation" (
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"isAccepted" boolean DEFAULT false,
	"actionTime" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityMedia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"imageUrl" text NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"uploadedBy" uuid NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"displayOrder" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entity_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityMember" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"managerRole" "managerRole" DEFAULT 'USER',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"userAddedForm" "userAddedForm",
	"memberStatusEnum" "memberStatusEnum" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	CONSTRAINT "communityMember_user_id_community_id_unique" UNIQUE("user_id","community_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityRating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"rating" "ratingEnum" NOT NULL,
	"review" text,
	"isVerified" boolean DEFAULT false NOT NULL,
	"verifiedBy" uuid,
	"verifiedAt" timestamp,
	"verificationReason" text,
	"isHelpful" boolean DEFAULT false NOT NULL,
	"helpfulCount" integer DEFAULT 0,
	"unhelpfulCount" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entity_id" uuid NOT NULL,
	CONSTRAINT "communityRating_user_id_community_id_entity_id_unique" UNIQUE("user_id","community_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityRatingSummary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"totalRatings" integer DEFAULT 0,
	"averageRating" numeric(3, 2) DEFAULT '0.00',
	"totalVerifiedRatings" integer DEFAULT 0,
	"averageVerifiedRating" numeric(3, 2) DEFAULT '0.00',
	"oneStar" integer DEFAULT 0,
	"twoStar" integer DEFAULT 0,
	"threeStar" integer DEFAULT 0,
	"fourStar" integer DEFAULT 0,
	"fiveStar" integer DEFAULT 0,
	"verifiedOneStar" integer DEFAULT 0,
	"verifiedTwoStar" integer DEFAULT 0,
	"verifiedThreeStar" integer DEFAULT 0,
	"verifiedFourStar" integer DEFAULT 0,
	"verifiedFiveStar" integer DEFAULT 0,
	"lastUpdated" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "communityRatingSummary_community_id_unique" UNIQUE("community_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityMemberRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"isAccepted" boolean DEFAULT false,
	"memberStatusEnum" "memberStatusEnum" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	CONSTRAINT "communityMemberRequest_user_id_community_id_unique" UNIQUE("user_id","community_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityTheme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"org_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityViews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "-community" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" varchar(61),
	"tagline" varchar(100),
	"creator_id" uuid,
	"addedBy" "addedBy",
	"org_id" uuid NOT NULL,
	"cover" text DEFAULT '/groups-default-cover-photo.jpg',
	"status" "communityEntityStatus" NOT NULL,
	"isApproved" boolean DEFAULT false NOT NULL,
	"description" varchar(300) DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"isFeatured" boolean DEFAULT false NOT NULL,
	"theme" uuid,
	"interests" text[],
	"categories" text[],
	"numberOfUser" integer DEFAULT 0,
	"numberOfLikes" integer DEFAULT 0,
	"numberOfPost" integer DEFAULT 0,
	"numberOfViews" integer DEFAULT 0,
	"tag" text[],
	"communityType" "communityTypeEnum" DEFAULT 'VIRTUAL' NOT NULL,
	"joiningTerms" "joiningTerms" DEFAULT 'ANYONE_CAN_JOIN',
	"privacy" "communityPrivacy" DEFAULT 'PUBLIC',
	"location" jsonb,
	"requireAdminApprovalForPosts" boolean DEFAULT false NOT NULL,
	"allowMemberInvites" boolean DEFAULT true NOT NULL,
	"allowMemberPosts" boolean DEFAULT true NOT NULL,
	"enableEvents" boolean DEFAULT true NOT NULL,
	"enableRatingsAndReviews" boolean DEFAULT false NOT NULL,
	"rules" jsonb,
	"overallRating" numeric(3, 2) DEFAULT '0.00',
	"totalRatings" integer DEFAULT 0,
	"verifiedRating" numeric(3, 2) DEFAULT '0.00',
	"totalVerifiedRatings" integer DEFAULT 0,
	"isFlagged" boolean DEFAULT false NOT NULL,
	"flaggedAt" timestamp,
	"flaggedBy" uuid,
	"flagReason" text,
	"isSuspended" boolean DEFAULT false NOT NULL,
	"suspendedAt" timestamp,
	"suspendedBy" uuid,
	"suspensionReason" text,
	"isArchived" boolean DEFAULT false NOT NULL,
	"archivedAt" timestamp,
	"archivedBy" uuid,
	"archivedReason" text,
	CONSTRAINT "-community_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ratingHelpfulness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rating_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"isHelpful" boolean NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ratingHelpfulness_rating_id_user_id_unique" UNIQUE("rating_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ratingReport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rating_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"reviewedBy" uuid,
	"reviewedAt" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ratingReport_rating_id_reporter_id_unique" UNIQUE("rating_id","reporter_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commentFeed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" varchar(1000) NOT NULL,
	"user_id" uuid,
	"feed_id" uuid NOT NULL,
	"addedBy" "addedBy" DEFAULT 'USER',
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reactionsFeed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"feed_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"reactionsType" "reactionsType" NOT NULL,
	"likedBy" "addedBy" DEFAULT 'USER',
	CONSTRAINT "reactionsFeed_user_id_feed_id_unique" UNIQUE("user_id","feed_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userWishListFeed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"feed_id" uuid NOT NULL,
	CONSTRAINT "userWishListFeed_feed_id_user_id_entity_id_unique" UNIQUE("feed_id","user_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_id" uuid,
	"meta" json,
	"url" text NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"group_Id" uuid,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT now(),
	"addedBy" "addedBy" DEFAULT 'USER'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userFeed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"priority" "userFeedPriority" DEFAULT 'NORMAL' NOT NULL,
	"status" "userFeedStatusEnum" DEFAULT 'PENDING' NOT NULL,
	"group_id" uuid,
	"org_id" uuid NOT NULL,
	"description" varchar(1000),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"source" "source" DEFAULT 'dashboard' NOT NULL,
	"event_id" uuid,
	"poll_id" uuid,
	"offer_id" uuid,
	"jobs_id" uuid,
	"forum_id" uuid,
	"marketPlace_id" uuid,
	"celebration_id" uuid,
	"story_id" uuid,
	"video_url" text,
	"thumbnail_url" text,
	"totalComment" integer DEFAULT 0 NOT NULL,
	"totalReactions" integer DEFAULT 0 NOT NULL,
	"totalReShare" integer DEFAULT 0 NOT NULL,
	"privacy" "feedPrivacy" DEFAULT 'PUBLIC',
	"repost_id" uuid,
	"reposted_by" uuid,
	"addedBy" "addedBy" DEFAULT 'USER',
	"postedOn" "feedPostedOn"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedBackType" "feedBackType" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedBackQuestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"isRequired" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"questionType" "questionType" NOT NULL,
	"feedBack_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobApplicant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"jobs_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"fullName" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"resume" text NOT NULL,
	CONSTRAINT "jobApplicant_user_id_jobs_id_unique" UNIQUE("user_id","jobs_id"),
	CONSTRAINT "uniqueJobApplicant" UNIQUE("user_id","jobs_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobApplications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"resume" text NOT NULL,
	"applied_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "jobApplications_user_id_job_id_unique" UNIQUE("user_id","job_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobAuditLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"logStatus" "communityEntityStatus",
	"performedBy" uuid NOT NULL,
	"reason" text,
	"previousState" jsonb,
	"newState" jsonb,
	"created_at" timestamp DEFAULT now(),
	"entity" uuid NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"action" "logAction"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobReports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"reportedBy" uuid NOT NULL,
	"entityId" uuid NOT NULL,
	"reason" "jobReportReason" NOT NULL,
	"description" text,
	"status" "reportStatus" DEFAULT 'PENDING' NOT NULL,
	"reviewedBy" uuid,
	"reviewedAt" timestamp,
	"reviewNotes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "jobReports_jobId_reportedBy_unique" UNIQUE("jobId","reportedBy")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobsVerification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isVerifiedAt" timestamp,
	"verifiedBy" uuid,
	"isVerified" boolean DEFAULT false,
	"verificationReason" text,
	"jobId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobViews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"viewedAt" timestamp DEFAULT now(),
	CONSTRAINT "jobViews_jobId_userId_unique" UNIQUE("jobId","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobss" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postedBy_id" uuid,
	"addedBy" "addedBy",
	"status" "communityEntityStatus" NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"company" jsonb NOT NULL,
	"salary" text,
	"slug" text,
	"description" text NOT NULL,
	"experienceLevel" "jobExperienceLevel" NOT NULL,
	"jobType" "jobTypes" NOT NULL,
	"workplaceType" "workplaceTypes" NOT NULL,
	"isApproved" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"tag" json,
	"experience" text,
	"interests" text[],
	"categories" text[],
	"numberOfViews" integer DEFAULT 0,
	"numberOfApplicant" integer DEFAULT 0,
	"applicationDeadline" date,
	"requirements" jsonb NOT NULL,
	"responsibilities" jsonb NOT NULL,
	"benefits" jsonb NOT NULL,
	"skills" jsonb NOT NULL,
	"isFeatured" boolean DEFAULT false NOT NULL,
	"location" jsonb NOT NULL,
	"locationLatLong" "geometry"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "savedJobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"savedAt" timestamp DEFAULT now(),
	CONSTRAINT "savedJobs_jobId_userId_unique" UNIQUE("jobId","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listingContacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listingId" uuid NOT NULL,
	"contactedBy" uuid NOT NULL,
	"sellerId" uuid NOT NULL,
	"conversationId" uuid NOT NULL,
	"messageId" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listingConversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listingId" uuid NOT NULL,
	"buyerId" uuid NOT NULL,
	"sellerId" uuid NOT NULL,
	"lastMessageAt" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listingAuditLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listingId" uuid NOT NULL,
	"logStatus" "communityEntityStatus",
	"performedBy" uuid NOT NULL,
	"reason" text,
	"previousState" jsonb,
	"newState" jsonb,
	"created_at" timestamp DEFAULT now(),
	"entity" uuid NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"action" "logAction"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listingMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversationId" uuid NOT NULL,
	"senderId" uuid NOT NULL,
	"content" text NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"readAt" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listingRating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listingId" uuid NOT NULL,
	"sellerId" uuid NOT NULL,
	"ratedBy" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listingReport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listingId" uuid NOT NULL,
	"reportedBy" uuid NOT NULL,
	"entityId" uuid NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"status" "reportStatus" DEFAULT 'PENDING' NOT NULL,
	"reviewedBy" uuid,
	"reviewedAt" timestamp,
	"reviewNotes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listingVerification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isVerifiedAt" timestamp,
	"verifiedBy" uuid,
	"isVerified" boolean DEFAULT false,
	"verificationReason" text,
	"listingId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing0" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postedBy_id" uuid,
	"addedBy" "addedBy",
	"entity_id" uuid NOT NULL,
	"title" text NOT NULL,
	"currency" text NOT NULL,
	"price" text NOT NULL,
	"condition" "listingConditionEnums" NOT NULL,
	"status" "communityEntityStatus" NOT NULL,
	"sku" text,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"isApproved" boolean DEFAULT false NOT NULL,
	"isExpired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"tag" json,
	"isFeatured" boolean DEFAULT false NOT NULL,
	"numberOfViews" integer DEFAULT 0,
	"numberOfContactClick" integer DEFAULT 0,
	"interests" text[],
	"categories" text[],
	"location" jsonb NOT NULL,
	"isSold" boolean DEFAULT false NOT NULL,
	"locationLatLong" "geometry",
	"lat" text,
	"lng" text,
	CONSTRAINT "listing0_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketPlaceMedia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"marketPlace_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "association" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"associationType" "associationType" NOT NULL,
	"logo" text NOT NULL,
	"about" text NOT NULL,
	CONSTRAINT "association_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challengesVisibility" "challengesVisibility" NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"association_id" uuid NOT NULL,
	"website_url" text NOT NULL,
	"challengesMode" "challengesMode" NOT NULL,
	"about" text NOT NULL,
	"registrationEndTime" date NOT NULL,
	"registrationStartTime" date NOT NULL,
	"challengesParticipationType" "challengesParticipationType" NOT NULL,
	"mimMember" varchar,
	"maxMember" varchar,
	CONSTRAINT "challenges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challengesAddress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location" text NOT NULL,
	"state" text NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"challenges_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courseRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"fullName" text NOT NULL,
	"contactNumber" text NOT NULL,
	"youTubeChannel" text,
	" platformDoYouSellCourses" text,
	"readyCourses" text NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentorships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isKyc" boolean DEFAULT false NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"mentorStatus" "mentorStatus" DEFAULT 'REQUESTED' NOT NULL,
	"displayName" text NOT NULL,
	"isApproved" boolean NOT NULL,
	"slug" text NOT NULL,
	"intro" text,
	"about" text,
	"introVideo" text,
	"featuredArticle" text,
	"whyDoWantBecomeMentor" text,
	"greatestAchievement" text,
	"availability" json NOT NULL,
	"agreement" boolean NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"category" text,
	"skills" jsonb,
	CONSTRAINT "mentorships_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentorBooking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"razorpay_signature" text,
	"user_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"amount" numeric,
	"payment" boolean NOT NULL,
	"isAccepted" boolean DEFAULT false NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"isCancel" boolean DEFAULT false NOT NULL,
	"requestStatus" "mentorShipRequestStatus",
	"url" text,
	"payment_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentorShipService" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentorServicesType" "mentorServicesType" NOT NULL,
	"servicesPriceType" "servicesPriceType" NOT NULL,
	"title" text NOT NULL,
	"duration" numeric NOT NULL,
	"price" numeric,
	"shortDescription" text,
	"description" text,
	"webinarUrl" text,
	"mentorship_id" uuid NOT NULL,
	"webinarDate" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentorShipTestimonial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"testimonial" text NOT NULL,
	"from" text NOT NULL,
	"mentorship_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentorshipCategory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentorshipSkills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userStory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" uuid,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"cover" text NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text,
	"isApproved" boolean DEFAULT false NOT NULL,
	"subTitle" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userStoryCategory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"org_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fundCampaign" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"cover" text NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"isApproved" boolean NOT NULL,
	"shortDescription" text NOT NULL,
	"description" text NOT NULL,
	"campaignType" "CampaignType" NOT NULL,
	"amount" numeric,
	"endDate" date NOT NULL,
	CONSTRAINT "fundCampaign_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaignAmountRecommendation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price" numeric NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"org_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaignCategory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"org_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fundCampaignGallery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"campaign_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moduleFaqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"faqModule" "module" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entityId" uuid NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issueComment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"user_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"page" text,
	"details" text,
	"module" text,
	"feature" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"entity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"ticket" integer NOT NULL,
	"type" text NOT NULL,
	"status" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chatStatusEnum" "connectionStatusEnum" DEFAULT 'ACCEPTED' NOT NULL,
	"user2_id" uuid NOT NULL,
	"entity" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user1Id" uuid NOT NULL,
	"user2Id" uuid NOT NULL,
	"entityId" uuid NOT NULL,
	"lastMessageAt" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversationId" uuid NOT NULL,
	"senderId" uuid NOT NULL,
	"content" text NOT NULL,
	"entityId" uuid NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"readAt" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blockedUsers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "blockedUsers_blocker_id_blocked_user_id_entity_id_unique" UNIQUE("blocker_id","blocked_user_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userConnections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user2_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"connectionStatusEnum" "connectionStatusEnum" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "userConnections_user_id_user2_id_entity_id_unique" UNIQUE("user_id","user2_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userConnectionsRequests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"connectionStatusEnum" "connectionStatusEnum" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "userConnectionsRequests_sender_id_receiver_id_entity_id_unique" UNIQUE("sender_id","receiver_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userFollows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "userFollows_follower_id_following_id_entity_id_unique" UNIQUE("follower_id","following_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userReports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reported_user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"status" "reportStatus" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "userReports_reporter_id_reported_user_id_entity_id_unique" UNIQUE("reporter_id","reported_user_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trendingConditionsEvents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"views" boolean DEFAULT true,
	"discussion" boolean DEFAULT true,
	"user" boolean DEFAULT true,
	"entity_id" uuid NOT NULL,
	"length" integer DEFAULT 5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trendingConditionsGroups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"views" boolean DEFAULT true,
	"discussion" boolean DEFAULT true,
	"user" boolean DEFAULT true,
	"likes" boolean DEFAULT true,
	"entity_id" uuid NOT NULL,
	"length" integer DEFAULT 5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trendingConditionsJobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"views" boolean DEFAULT true,
	"applicant" boolean DEFAULT true,
	"entity_id" uuid NOT NULL,
	"length" integer DEFAULT 5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trendingConditionsListing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"views" boolean DEFAULT true,
	"entity_id" uuid NOT NULL,
	"length" integer DEFAULT 5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trendingConditionsStories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"views" boolean DEFAULT true,
	"lastAdded" boolean DEFAULT true,
	"entity_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS " entitySettingsEvents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autoApprove" boolean DEFAULT false,
	"entity_id" uuid NOT NULL,
	"termsAndCondition" text DEFAULT '<p>Terns and conditions</p>' NOT NULL,
	"guideLine" text DEFAULT '<p>guideLine</p>' NOT NULL,
	"isComplted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entitySettingsGroups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autoApprove" boolean DEFAULT false,
	"entity_id" uuid NOT NULL,
	"termsAndCondition" text DEFAULT '<p>Terns and conditions</p>' NOT NULL,
	"guideLine" text DEFAULT '<p>guideLine</p>' NOT NULL,
	"isComplted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entitySettingsJobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autoApprove" boolean DEFAULT false,
	"entity_id" uuid NOT NULL,
	"isComplted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entitySettingsListing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autoApprove" boolean DEFAULT false,
	"entity_id" uuid NOT NULL,
	"isComplted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entityStoriesSettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autoApprove" boolean DEFAULT false,
	"entity_id" uuid NOT NULL,
	"termsAndCondition" text DEFAULT '<p>Terns and conditions</p>' NOT NULL,
	"guideLine" text DEFAULT '<p>guideLine</p>' NOT NULL,
	"isComplted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userWishListEvents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "userWishListEvents_event_id_user_id_entity_id_unique" UNIQUE("event_id","user_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userWishListGroup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	CONSTRAINT "userWishListGroup_job_id_user_id_entity_id_unique" UNIQUE("job_id","user_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobNotifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"notification_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listingNotifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" uuid,
	"notification_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userNotifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notificationType" "notificationType" NOT NULL,
	"user_id" uuid NOT NULL,
	"sender_id" uuid,
	"entity_id" uuid NOT NULL,
	"content" text,
	"feed_id" uuid,
	"connection_id" uuid,
	"communities_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hashtag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"entity_Id" uuid NOT NULL,
	CONSTRAINT "hashtag_entity_Id_title_unique" UNIQUE("entity_Id","title")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hashtagFeed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_id" uuid NOT NULL,
	"hashtag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "hashtagFeed_feed_id_hashtag_id_unique" UNIQUE("feed_id","hashtag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hashtagFollowers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hashtag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "hashtagFollowers_user_id_hashtag_id_unique" UNIQUE("user_id","hashtag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"entity_Id" uuid NOT NULL,
	"user_Id" uuid,
	"highlightsType" "highlightsType" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"announcement_id" uuid,
	"story_id" uuid,
	"isExpirable" boolean NOT NULL,
	"expiry" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note" text NOT NULL,
	"image" text,
	"description" text NOT NULL,
	"entity_Id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discussionCategory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"isActive" boolean DEFAULT true,
	"addedBy" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"entity_id" uuid NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discussionForums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"isApproved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status" "discussionForumStatus" DEFAULT 'PENDING' NOT NULL,
	"isApprovedAt" timestamp,
	"title" varchar(255) NOT NULL,
	"slug" varchar(350),
	"content" varchar(1000) NOT NULL,
	"approvedBy" uuid,
	"verificationReason" varchar(500),
	"upVotes" integer DEFAULT 0,
	"downVotes" integer DEFAULT 0,
	"totalComments" integer DEFAULT 0,
	"category" uuid NOT NULL,
	"isAnonymous" boolean DEFAULT false,
	"addedBy" "addedBy" DEFAULT 'USER',
	"user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discussionForumAuditLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discussionForumId" uuid NOT NULL,
	"logStatus" "logStatus",
	"performedBy" uuid NOT NULL,
	"reason" text,
	"previousState" jsonb,
	"newState" jsonb,
	"created_at" timestamp DEFAULT now(),
	"entity" uuid NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discussionForumComments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"discussionForum_id" uuid,
	"content" varchar(1000) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"commentedBy" "addedBy" DEFAULT 'USER',
	CONSTRAINT "discussionForumComments_user_id_discussionForum_id_created_at_unique" UNIQUE("user_id","discussionForum_id","created_at")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discussionVotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"discussionForum_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"votedBy" "addedBy" DEFAULT 'USER',
	"type" "discussionVoteType" NOT NULL,
	CONSTRAINT "discussionVotes_user_id_discussionForum_id_unique" UNIQUE("user_id","discussionForum_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forumVerification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isVerifiedAt" timestamp,
	"verifiedBy" uuid,
	"isVerified" boolean DEFAULT false,
	"verificationReason" text,
	"discussionForumId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pollOptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"text" varchar(255) NOT NULL,
	"order" integer NOT NULL,
	"votes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pollResults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pollOptions_id" uuid NOT NULL,
	"poll_id" uuid NOT NULL,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"voted" "addedBy" DEFAULT 'USER'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"isApproved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status" "pollsStatus" DEFAULT 'APPROVED' NOT NULL,
	"resultVisibility" "pollResultVisibilityType" NOT NULL,
	"title" varchar(255) NOT NULL,
	"endDate" timestamp,
	"question" varchar(255) NOT NULL,
	"addedBy" "addedBy" DEFAULT 'USER',
	"user_id" uuid,
	"totalVotes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pollsAuditLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pollsId" uuid NOT NULL,
	"logStatus" "logStatus",
	"performedBy" uuid NOT NULL,
	"reason" text,
	"previousState" jsonb,
	"newState" jsonb,
	"created_at" timestamp DEFAULT now(),
	"entity" uuid NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customFormAnswers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"answer" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customFormFields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"questions" varchar(255) NOT NULL,
	"type" "customFormFieldType" NOT NULL,
	"order" integer NOT NULL,
	"options" jsonb,
	"required" boolean DEFAULT false NOT NULL,
	"maxLength" integer,
	"scale" integer,
	"ratingType" varchar(50),
	"min" integer,
	"max" integer,
	"labels" jsonb,
	"allowMultiple" boolean DEFAULT false,
	"fieldName" varchar(255),
	"defaultValue" varchar(255),
	"allowedTypes" jsonb,
	"maxSize" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customFormSubmissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid,
	"user_id" uuid,
	"responses" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customForms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"isApproved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status" "customFormStatus" DEFAULT 'APPROVED' NOT NULL,
	"title" varchar(255) NOT NULL,
	"endDate" timestamp,
	"description" varchar(255) NOT NULL,
	"addedBy" "addedBy" DEFAULT 'USER',
	"user_id" uuid,
	"previewType" "customFormPreviewTypes" DEFAULT 'MULTI_STEP' NOT NULL,
	"apperenace" jsonb,
	"resultVisibility" "customFormResultVisibilityType" DEFAULT 'ADMIN' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customFormsAuditLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formId" uuid NOT NULL,
	"logStatus" "logStatus",
	"performedBy" uuid NOT NULL,
	"reason" text,
	"previousState" jsonb,
	"newState" jsonb,
	"created_at" timestamp DEFAULT now(),
	"entity" uuid NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gamification_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "badge_type" NOT NULL,
	"module" "points_ddssdmodule",
	"action" varchar(100),
	"target_value" integer NOT NULL,
	"icon" varchar(10),
	"description" text,
	"condition" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"entity_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gamificationUser" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"current_rank_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	CONSTRAINT "gamificationUser_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gamification_point_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_" "points_ddssdmodule" NOT NULL,
	"action" "user_action_gamification" NOT NULL,
	"trigger" "trigger_type" DEFAULT 'RECURRING' NOT NULL,
	"points" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"entity_id" uuid NOT NULL,
	CONSTRAINT "gamification_point_rules_module__action_trigger_entity_id_unique" UNIQUE("module_","action","trigger","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gamification_ranks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "rank_type" NOT NULL,
	"min_points" integer,
	"max_points" integer,
	"min_badges" integer,
	"max_badges" integer,
	"color" varchar(7) NOT NULL,
	"icon" varchar(10),
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"entity_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gamification_user_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"module" "points_ddssdmodule" NOT NULL,
	"action" varchar(100) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gamification_user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gamification_user_points_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"point_rule_id" uuid NOT NULL,
	"points_earned" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gamification_user_rank_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_rank_id" uuid,
	"to_rank_id" uuid NOT NULL,
	"achieved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "celebration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "pollsStatus" DEFAULT 'APPROVED' NOT NULL,
	"user_id" uuid,
	"entity_id" uuid NOT NULL,
	"celebrationType" "celebration_type" NOT NULL,
	"title" varchar(128),
	"description" text,
	"cover" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offers" (
	"cover" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255),
	"description" text,
	"location" jsonb,
	"company" jsonb NOT NULL,
	"timeline" jsonb,
	"terms_and_conditions" text,
	"website" varchar(255),
	"org_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storiesss" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entityId" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"image" varchar(512) NOT NULL,
	"caption" varchar(300),
	"text_overlays" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_storiess" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entityId" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"media_url" varchar(512) NOT NULL,
	"caption" varchar(300),
	"text_overlays" json,
	"created_at" timestamp NOT NULL,
	"expired_at" timestamp NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userToEntityId" uuid NOT NULL,
	"action" "reportStatus",
	"module" "reportModule",
	"performedBy" uuid,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	"entity" uuid NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "slug_type_unique" ON "staticPages" ("slug","type_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chats_user_pair_idx" ON "chats" ("user_id","user2_id","entity");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "otp" ADD CONSTRAINT "otp_user_id_admin_id_fk" FOREIGN KEY ("user_id") REFERENCES "admin"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "websites" ADD CONSTRAINT "websites_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "entity"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "navbars" ADD CONSTRAINT "navbars_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "footers" ADD CONSTRAINT "footers_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pages" ADD CONSTRAINT "pages_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "modules" ADD CONSTRAINT "modules_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "eventSpeakers" ADD CONSTRAINT "eventSpeakers_event_id_eventsss_id_fk" FOREIGN KEY ("event_id") REFERENCES "eventsss"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "eventTeams" ADD CONSTRAINT "eventTeams_event_id_eventsss_id_fk" FOREIGN KEY ("event_id") REFERENCES "eventsss"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "eventTeams" ADD CONSTRAINT "eventTeams_user_id_thricoUser_id_fk" FOREIGN KEY ("user_id") REFERENCES "thricoUser"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "eventsAgenda" ADD CONSTRAINT "eventsAgenda_eventId_eventsss_id_fk" FOREIGN KEY ("eventId") REFERENCES "eventsss"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "eventsSponsorShip" ADD CONSTRAINT "eventsSponsorShip_eventId_eventsss_id_fk" FOREIGN KEY ("eventId") REFERENCES "eventsss"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "eventsVenue" ADD CONSTRAINT "eventsVenue_event_id_eventsss_id_fk" FOREIGN KEY ("event_id") REFERENCES "eventsss"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commentFeed" ADD CONSTRAINT "commentFeed_feed_id_userFeed_id_fk" FOREIGN KEY ("feed_id") REFERENCES "userFeed"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reactionsFeed" ADD CONSTRAINT "reactionsFeed_feed_id_userFeed_id_fk" FOREIGN KEY ("feed_id") REFERENCES "userFeed"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userWishListFeed" ADD CONSTRAINT "userWishListFeed_feed_id_userFeed_id_fk" FOREIGN KEY ("feed_id") REFERENCES "userFeed"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jobApplicant" ADD CONSTRAINT "jobApplicant_jobs_id_jobss_id_fk" FOREIGN KEY ("jobs_id") REFERENCES "jobss"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jobApplications" ADD CONSTRAINT "jobApplications_job_id_jobss_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobss"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jobReports" ADD CONSTRAINT "jobReports_jobId_jobss_id_fk" FOREIGN KEY ("jobId") REFERENCES "jobss"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jobViews" ADD CONSTRAINT "jobViews_jobId_jobss_id_fk" FOREIGN KEY ("jobId") REFERENCES "jobss"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "savedJobs" ADD CONSTRAINT "savedJobs_jobId_jobss_id_fk" FOREIGN KEY ("jobId") REFERENCES "jobss"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customFormAnswers" ADD CONSTRAINT "customFormAnswers_submission_id_customFormSubmissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "customFormSubmissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customFormAnswers" ADD CONSTRAINT "customFormAnswers_field_id_customFormFields_id_fk" FOREIGN KEY ("field_id") REFERENCES "customFormFields"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamificationUser" ADD CONSTRAINT "gamificationUser_current_rank_id_gamification_ranks_id_fk" FOREIGN KEY ("current_rank_id") REFERENCES "gamification_ranks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_user_actions" ADD CONSTRAINT "gamification_user_actions_user_id_gamificationUser_id_fk" FOREIGN KEY ("user_id") REFERENCES "gamificationUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_user_badges" ADD CONSTRAINT "gamification_user_badges_user_id_gamificationUser_id_fk" FOREIGN KEY ("user_id") REFERENCES "gamificationUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_user_badges" ADD CONSTRAINT "gamification_user_badges_badge_id_gamification_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "gamification_badges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_user_points_history" ADD CONSTRAINT "gamification_user_points_history_user_id_gamificationUser_id_fk" FOREIGN KEY ("user_id") REFERENCES "gamificationUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_user_points_history" ADD CONSTRAINT "gamification_user_points_history_point_rule_id_gamification_point_rules_id_fk" FOREIGN KEY ("point_rule_id") REFERENCES "gamification_point_rules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_user_rank_history" ADD CONSTRAINT "gamification_user_rank_history_user_id_gamificationUser_id_fk" FOREIGN KEY ("user_id") REFERENCES "gamificationUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_user_rank_history" ADD CONSTRAINT "gamification_user_rank_history_from_rank_id_gamification_ranks_id_fk" FOREIGN KEY ("from_rank_id") REFERENCES "gamification_ranks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_user_rank_history" ADD CONSTRAINT "gamification_user_rank_history_to_rank_id_gamification_ranks_id_fk" FOREIGN KEY ("to_rank_id") REFERENCES "gamification_ranks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

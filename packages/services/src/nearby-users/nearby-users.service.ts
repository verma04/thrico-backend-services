import {
  AppDatabase,
  userLocation,
  userNearbySettings,
  userToEntity,
  user,
  aboutUser,
  groups,
  events,
  mentorShip,
  cities,
} from "@thrico/database";
import { and, eq, sql, or, ne, inArray } from "drizzle-orm";
import { log } from "@thrico/logging";

export class NearbyUsersService {
  static async detectCity(db: AppDatabase, latitude: number, longitude: number) {
    try {
      const cityResult = await db
        .select({ id: cities.id, name: cities.name })
        .from(cities)
        .where(
          sql`ST_Contains(
            ${cities.boundaryPolygon},
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography::geometry
          )`
        )
        .limit(1);

      return cityResult[0] || null;
    } catch (error) {
      log.error("Error detecting city", error as Error);
      return null;
    }
  }

  static async getNearbyUsers(
    db: AppDatabase,
    params: {
      userId: string;
      entityId: string;
      latitude: number;
      longitude: number;
      limit?: number;
      cursor?: string;
    }
  ) {
    const { userId, entityId, latitude, longitude, limit = 50, cursor } = params;

    try {
      const city = await this.detectCity(db, latitude, longitude);
      
      let baseQuery = db
        .select({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          headline: aboutUser.headline,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          privacy: userNearbySettings.privacy,
          distance: sql<number>`ST_Distance(
            ${userLocation.location},
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          )`.as("distance"),
        })
        .from(userLocation)
        .innerJoin(user, eq(userLocation.userId, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .innerJoin(userToEntity, eq(user.id, userToEntity.userId))
        .leftJoin(userNearbySettings, eq(user.id, userNearbySettings.userId));

      const conditions = [
        eq(userToEntity.entityId, entityId),
        ne(user.id, userId),
        or(
          eq(userNearbySettings.privacy, "VISIBLE"),
          eq(userNearbySettings.privacy, "APPROXIMATE"),
          sql`${userNearbySettings.privacy} IS NULL`
        ),
      ];

      if (city) {
        conditions.push(eq(userToEntity.cityId, city.id));
      } else {
        // Fallback to 200km radius if no city is detected or cities table is empty
        conditions.push(
          sql`ST_DWithin(
            ${userLocation.location},
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            200000
          )`
        );
      }

      if (cursor) {
        conditions.push(sql`${user.id} > ${cursor}`);
      }

      const nearbyUsers = await baseQuery
        .where(and(...conditions))
        .orderBy(user.id)
        .limit(limit);

      // Fetch mutual counts
      const usersWithMutuals = await Promise.all(
        nearbyUsers.map(async (u) => {
          const communityResult = await db
            .select({ count: sql`count(*)` })
            .from(sql`"communityMember" as cm1`)
            .innerJoin(sql`"communityMember" as cm2`, sql`cm1.community_id = cm2.community_id`)
            .where(
              and(
                sql`cm1.user_id = ${userId}`,
                sql`cm2.user_id = ${u.id}`,
                sql`cm1."memberStatusEnum" = 'ACCEPTED'`,
                sql`cm2."memberStatusEnum" = 'ACCEPTED'`
              )
            );
          
          const interestResult = await db
            .select({ count: sql`count(*)` })
            .from(userToEntity)
            .where(
              and(
                eq(userToEntity.userId, u.id),
                sql`interests && (SELECT interests FROM "userToEntity" WHERE user_id = ${userId} AND entity_id = ${entityId} LIMIT 1)`
              )
            );

          return {
            ...u,
            mutualCommunities: Number(communityResult[0]?.count || 0),
            mutualInterests: Number(interestResult[0]?.count || 0),
          };
        })
      );

      return {
        cityId: city?.id || null,
        cityName: city?.name || "Unknown",
        users: usersWithMutuals.map((u) => ({
          ...u,
          latitude: u.privacy === "APPROXIMATE" ? Math.round(Number(u.latitude) * 100) / 100 : u.latitude,
          longitude: u.privacy === "APPROXIMATE" ? Math.round(Number(u.longitude) * 100) / 100 : u.longitude,
          distance: Math.round(u.distance),
        })),
        nextCursor: nearbyUsers.length === limit ? nearbyUsers[nearbyUsers.length - 1].id : null,
      };
    } catch (error) {
      log.error("Error in getNearbyUsers service", error as Error);
      throw error;
    }
  }

  static async getNearbyCommunities(
    db: AppDatabase,
    params: {
      entityId: string;
      latitude: number;
      longitude: number;
      limit?: number;
    }
  ) {
    const { entityId, latitude, longitude, limit = 50 } = params;

    try {
      const city = await this.detectCity(db, latitude, longitude);

      const conditions = [
        eq(groups.entity, entityId),
        eq(groups.status, "APPROVED"),
      ];

      if (city) {
        conditions.push(eq(groups.cityId, city.id));
      } else {
        conditions.push(
          sql`ST_DWithin(
            ${groups.locationPoint},
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            200000
          )`
        );
      }

      const nearbyCommunities = await db
        .select({
          id: groups.id,
          title: groups.title,
          slug: groups.slug,
          cover: groups.cover,
          description: groups.description,
          category: groups.categories,
          numberOfUser: groups.numberOfUser,
          distance: sql<number>`ST_Distance(
            ${groups.locationPoint},
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          )`.as("distance"),
        })
        .from(groups)
        .where(and(...conditions))
        .orderBy(sql`distance ASC`)
        .limit(limit);

      return nearbyCommunities.map((c) => ({
        ...c,
        distance: Math.round(c.distance),
      }));
    } catch (error) {
      log.error("Error in getNearbyCommunities service", error as Error);
      throw error;
    }
  }

  static async getNearbyEvents(
    db: AppDatabase,
    params: {
      entityId: string;
      latitude: number;
      longitude: number;
      limit?: number;
    }
  ) {
    const { entityId, latitude, longitude, limit = 50 } = params;

    try {
      const city = await this.detectCity(db, latitude, longitude);

      const conditions = [
        eq(events.entityId, entityId),
        eq(events.status, "APPROVED"),
      ];

      if (city) {
        conditions.push(eq(events.cityId, city.id));
      } else {
        conditions.push(
          sql`ST_DWithin(
            ${events.locationPoint},
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            200000
          )`
        );
      }

      const nearbyEvents = await db
        .select({
          id: events.id,
          title: events.title,
          slug: events.slug,
          cover: events.cover,
          type: events.type,
          startDate: events.startDate,
          status: events.status,
          distance: sql<number>`ST_Distance(
            ${events.locationPoint},
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          )`.as("distance"),
        })
        .from(events)
        .where(and(...conditions))
        .orderBy(sql`distance ASC`)
        .limit(limit);

      return nearbyEvents.map((e) => ({
        ...e,
        distance: Math.round(e.distance),
      }));
    } catch (error) {
      log.error("Error in getNearbyEvents service", error as Error);
      throw error;
    }
  }

  static async getNearbyMentors(
    db: AppDatabase,
    params: {
      userId: string;
      entityId: string;
      latitude: number;
      longitude: number;
      limit?: number;
    }
  ) {
    const { userId, entityId, latitude, longitude, limit = 50 } = params;

    try {
      const city = await this.detectCity(db, latitude, longitude);

      const conditions = [
        eq(userToEntity.entityId, entityId),
        ne(user.id, userId),
        eq(mentorShip.mentorStatus, "APPROVED"),
      ];

      if (city) {
        conditions.push(eq(mentorShip.cityId, city.id));
      } else {
        conditions.push(
          sql`ST_DWithin(
            ${userLocation.location},
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            200000
          )`
        );
      }

      const nearbyMentors = await db
        .select({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          headline: aboutUser.headline,
          mentorId: mentorShip.id,
          category: mentorShip.category,
          skills: mentorShip.skills,
          distance: sql<number>`ST_Distance(
            ${userLocation.location},
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          )`.as("distance"),
        })
        .from(userLocation)
        .innerJoin(user, eq(userLocation.userId, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .innerJoin(userToEntity, eq(user.id, userToEntity.userId))
        .innerJoin(mentorShip, eq(userToEntity.id, mentorShip.user))
        .where(and(...conditions))
        .orderBy(sql`distance ASC`)
        .limit(limit);

      return nearbyMentors.map((m) => ({
        ...m,
        distance: Math.round(m.distance),
      }));
    } catch (error) {
      log.error("Error in getNearbyMentors service", error as Error);
      throw error;
    }
  }

  static async updateLocation(
    db: AppDatabase,
    userId: string,
    latitude: number,
    longitude: number
  ): Promise<any> {
    try {
      const city = await this.detectCity(db, latitude, longitude);
      const existingLocation = await db.query.userLocation.findFirst({
        where: eq(userLocation.userId, userId),
      });

      const locationPoint = `POINT(${longitude} ${latitude})`;

      if (existingLocation) {
        await db
          .update(userLocation)
          .set({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            location: sql`ST_SetSRID(ST_GeomFromText(${locationPoint}), 4326)`,
            updatedAt: new Date(),
          })
          .where(eq(userLocation.id, existingLocation.id));
      } else {
        await db.insert(userLocation).values({
          userId,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          location: sql`ST_SetSRID(ST_GeomFromText(${locationPoint}), 4326)`,
        });
      }

      // Sync cityId in userToEntity
      if (city) {
        await db
          .update(userToEntity)
          .set({ cityId: city.id })
          .where(eq(userToEntity.userId, userId));
      }

      return { success: true, cityId: city?.id || null };
    } catch (error) {
      log.error("Error updating user location", error as Error);
      throw error;
    }
  }

  static async getMyLocation(db: AppDatabase, userId: string) {
    try {
      const location = await db.query.userLocation.findFirst({
        where: eq(userLocation.userId, userId),
      });
      return location || null;
    } catch (error) {
      log.error("Error in getMyLocation service", error as Error);
      throw error;
    }
  }

  static async updateNearbySettings(
    db: AppDatabase,
    userId: string,
    privacy: "VISIBLE" | "APPROXIMATE" | "HIDDEN"
  ): Promise<any> {
    try {
      const existing = await db.query.userNearbySettings.findFirst({
        where: eq(userNearbySettings.userId, userId),
      });

      if (existing) {
        await db
          .update(userNearbySettings)
          .set({ privacy, updatedAt: new Date() })
          .where(eq(userNearbySettings.id, existing.id));
      } else {
        await db.insert(userNearbySettings).values({
          userId,
          privacy,
        });
      }
      return { privacy };
    } catch (error) {
      log.error("Error updating nearby settings", error as Error);
      throw error;
    }
  }

  static async getNearbySettings(db: AppDatabase, userId: string) {
    try {
      const settings = await db.query.userNearbySettings.findFirst({
        where: eq(userNearbySettings.userId, userId),
      });
      return settings || { privacy: "VISIBLE" };
    } catch (error) {
      log.error("Error fetching nearby settings", error as Error);
      throw error;
    }
  }
}

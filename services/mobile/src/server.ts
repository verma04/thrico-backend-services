import express, { Request, Response, NextFunction } from "express";
// Load environment variables first, before any other imports
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { createServer } from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";

import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { typeDefs } from "./schema/typeDefs";
import { resolvers } from "./schema/resolvers";

import { requestLogger, errorLogger, log } from "@thrico/logging";
import { GraphQLContext } from "@thrico/shared";
import { graphqlUploadExpress } from "graphql-upload-minimal";
import checkAuth from "./utils/auth/checkAuth.utils";

import { connectDynamo } from "@thrico/database";
import { networkTypes } from "./schema/network/types";
import { networkResolvers } from "./schema/network/resolvers";
import { feedTypes } from "./schema/feed/types";
import { feedResolvers } from "./schema/feed/resolvers";
import { forumTypes } from "./schema/forum/types";
import { forumResolvers } from "./schema/forum/resolvers";
import { pollTypes } from "./schema/poll/types";
import { jobsResolvers } from "./schema/jobs/resolvers";
import { jobsTypes } from "./schema/jobs/types";
import { communitiesTypes } from "./schema/community/types";
import {
  communitiesResolvers,
  communityMemberResolvers,
} from "./schema/community/resolvers";
import { marketPlaceTypes } from "./schema/listing/types";
import { marketPlaceResolvers } from "./schema/listing/resolvers";
import { profileTypes } from "./schema/profile/types";
import { profileResolvers } from "./schema/profile/resolvers";
import { storiesTypes } from "./schema/stories/types";
import { storiesResolvers } from "./schema/stories/resolvers";
import { gamificationTypes } from "./schema/gamification/types";
import { gamificationResolvers } from "./schema/gamification/resolvers";
import { offersTypes } from "./schema/offers/types";
import { offersResolvers } from "./schema/offers/resolvers";
import { eventsTypes } from "./schema/events/types";
import { eventsResolvers } from "./schema/events/resolvers";
import { mentorshipTypes } from "./schema/mentorship/types";
import { mentorshipResolvers } from "./schema/mentorship/resolvers";
import { notificationTypes } from "./schema/notification/types";
import { notificationResolvers } from "./schema/notification/resolvers";
import { surveyTypes } from "./schema/survey/types";
import { surveyResolvers } from "./schema/survey/resolvers";
import { chatTypes } from "./schema/chat/types";
import { chatResolvers } from "./schema/chat/resolvers";
import { shopTypes } from "./schema/shop/types";
import { shopResolvers } from "./schema/shop/resolvers";

const PORT = process.env.MOBILE_GRAPHQL_PORT || 3333;

async function startServer() {
  // Connect to DynamoDB
  connectDynamo();

  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      credentials: true,
    }),
  );

  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 1000),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "200", 10000),
    message: "Too many requests, please try again later.",
  });
  app.use("/graphql", limiter);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(graphqlUploadExpress());
  app.use(requestLogger);

  // Authentication Middleware
  app.use(async (req: any, res: Response, next: NextFunction) => {
    try {
      if (req.headers.authorization) {
        req.user = await checkAuth(req);
      }
      next();
    } catch (error) {
      // Don't throw here, let resolvers decide if they need authenticated user
      next();
    }
  });

  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", service: "mobile" });
  });

  // SSE for real-time notifications
  // const { handleNotificationStream } =
  //   await import("./routes/notification.routes");
  // app.get("/notifications/stream", handleNotificationStream);

  const httpServer = createServer(app);

  const schema = makeExecutableSchema({
    typeDefs: [
      typeDefs,
      networkTypes,
      feedTypes,
      forumTypes,
      pollTypes,
      jobsTypes,
      communitiesTypes,
      marketPlaceTypes,
      profileTypes,
      storiesTypes,
      gamificationTypes,
      offersTypes,
      eventsTypes,
      mentorshipTypes,
      notificationTypes,
      surveyTypes,
      chatTypes,
      shopTypes,
    ],
    resolvers: [
      resolvers,
      networkResolvers,
      feedResolvers,
      forumResolvers,
      jobsResolvers,
      communitiesResolvers,
      communityMemberResolvers,
      marketPlaceResolvers,
      profileResolvers,
      storiesResolvers,
      gamificationResolvers,
      offersResolvers,
      eventsResolvers,
      mentorshipResolvers,
      notificationResolvers,
      surveyResolvers,
      chatResolvers,
      shopResolvers,
    ],
  });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    formatError: (error) => {
      log.error("GraphQL error (mobile)", {
        message: error.message,
        path: error.path,
        extensions: error.extensions,
      });
      return error;
    },
  });

  await server.start();
  log.info("Apollo Server started (mobile)");

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }): Promise<any> => {
        return req;
      },
    }),
  );

  app.use(errorLogger);

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    log.error("Express error (mobile)", {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });

    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });

  httpServer.listen(PORT, () => {
    log.info(`Mobile GraphQL server running`, {
      port: PORT,
      graphqlPath: "/graphql",
      environment: process.env.NODE_ENV,
    });
  });

  process.on("SIGTERM", () => {
    log.info("SIGTERM received, shutting down gracefully (mobile)");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    log.info("SIGINT received, shutting down gracefully (mobile)");
    process.exit(0);
  });
}

startServer().catch((error) => {
  log.error("Failed to start mobile server", { error: error.message });
  process.exit(1);
});

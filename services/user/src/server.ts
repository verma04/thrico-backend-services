import express, { Request, Response, NextFunction } from "express";
// Load environment variables first, before any other imports
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { createServer } from "http";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@apollo/server/express4";
import { graphqlUploadExpress } from "graphql-upload-minimal";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { typeDefs } from "./schema/typeDefs";
import { resolvers } from "./schema/resolvers";
import { requestLogger, errorLogger, log } from "@thrico/logging";
import { GraphQLContext } from "@thrico/shared";
import checkAuth from "./utils/auth/checkAuth.utils";

import { connectDynamo } from "@thrico/database";

const PORT = process.env.USER_GRAPHQL_PORT || 2222;
const CORS_ORIGIN = process.env.CORS_ORIGIN?.split(",") || [
  "http://localhost:3000",
];

async function startServer() {
  // Connect to DynamoDB
  connectDynamo();

  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      // origin: CORS_ORIGIN,
      credentials: true,
    })
  );

  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "200", 10),
    message: "Too many requests, please try again later.",
  });
  app.use("/graphql", limiter);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
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
    res.json({ status: "ok", service: "user" });
  });

  // Build an executable schema so it can be shared between
  // the HTTP Apollo Server and the WebSocket graphql-ws server.
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Wrap Express in a plain http.Server so we can attach the WS server.
  const httpServer = createServer(app);

  // WebSocket server — runs on the same port/path as HTTP GraphQL.
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  // useServer returns a cleanup handle we call when Apollo drains.
  const wsServerCleanup = useServer(
    {
      schema,
      // Forward connection params as context so subscriptions can auth.
      context: async (ctx: { connectionParams?: Record<string, unknown> }) => {
        return { headers: ctx.connectionParams ?? {} };
      },
    },
    wsServer
  );

  const server = new ApolloServer<GraphQLContext>({
    schema,
    csrfPrevention: false, // Disable CSRF for easier file uploads handling
    plugins: [
      // Gracefully shut down the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Gracefully shut down the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await wsServerCleanup.dispose();
            },
          };
        },
      },
    ],
    formatError: (error) => {
      log.error("GraphQL error (user)", {
        message: error.message,
        path: error.path,
        extensions: error.extensions,
      });
      return error;
    },
  });

  await server.start();
  log.info("Apollo Server started (user) — HTTP + WebSocket");

  app.use(
    "/graphql",
    graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
    expressMiddleware(server, {
      context: async ({ req }): Promise<any> => {
        // The Express middleware at line 60-70 already tries to authenticate
        // and populates req.user if successful.
        // Return the request object for public operations (like login, register, health)
        return req;
      },
    })
  );

  app.use(errorLogger);

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    log.error("Express error (user)", {
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

  // Use httpServer.listen instead of app.listen so the WS server
  // shares the same port.
  httpServer.listen(PORT, () => {
    log.info(`User GraphQL server running`, {
      port: PORT,
      graphqlPath: `/graphql`,
      subscriptionsPath: `ws://localhost:${PORT}/graphql`,
      environment: process.env.NODE_ENV,
    });
  });

  process.on("SIGTERM", () => {
    log.info("SIGTERM received, shutting down gracefully (user)");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    log.info("SIGINT received, shutting down gracefully (user)");
    process.exit(0);
  });
}

startServer().catch((error) => {
  log.error("Failed to start user server", { error: error.message });
  process.exit(1);
});

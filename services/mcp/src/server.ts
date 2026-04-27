import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import helmet from "helmet";
import { typeDefs } from "./schema/typeDefs";
import { resolvers } from "./schema/resolvers";
import { requestLogger, errorLogger, log } from "@thrico/logging";
import { GraphQLContext } from "@thrico/shared";
import { getDb, mcpKeys, mcpLogs } from "@thrico/database";
import { eq } from "drizzle-orm";
import { DatabaseRegion } from "@thrico/shared";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MCPRequestSchema, MCPResponse } from "./protocol";
import { executeAction } from "./actions";
import { executeRouter } from "./routes/execute";
import crypto from "crypto";

import { findMCPKeyAcrossRegions } from "./utils/auth";

const PORT = process.env.MCP_SERVICE_PORT || 8888;
const HOST = process.env.MCP_HOST || "mcp.thrico.app";

async function startServer() {
  const app = express();
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use((req, res, next) => {
    if (
      req.path === "/sse" ||
      req.path === "/messages" ||
      (req.path === "/" && req.method === "POST")
    ) {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  // --- Official MCP Server Implementation ---
  const createMCPServer = (session: {
    entityId: string;
    region: DatabaseRegion;
    sessionId: string;
    apiKey: string;
  }) => {
    const mcpServer = new Server(
      {
        name: "thrico-mcp",
        version: "1.0.2",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    );

    // List available tools
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      log.info("MCP: ListToolsRequest received", {
        sessionId: session.sessionId,
        instanceId,
      });
      return {
        tools: [
          {
            name: "create_feed",
            description: "Create a new community feed post",
            inputSchema: {
              type: "object",
              properties: {
                content: { type: "string" },
                privacy: { type: "string", enum: ["PUBLIC", "PRIVATE"] },
              },
              required: ["content"],
            },
          },
          {
            name: "create_poll",
            description: "Create a new interactive poll",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                options: { type: "array", items: { type: "string" } },
              },
              required: ["title", "options"],
            },
          },
          {
            name: "create_community",
            description: "Create a new community",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                privacy: { type: "string", enum: ["PUBLIC", "PRIVATE"] },
                communityType: { type: "string", enum: ["VIRTUAL", "HYBRID", "INPERSON"] },
                tagline: { type: "string" },
              },
              required: ["title"],
            },
          },
          {
            name: "create_listing",
            description: "Create a new marketplace listing",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                currency: { type: "string" },
                condition: { type: "string", enum: ["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"] },
                category: { type: "string" },
              },
              required: ["title", "price"],
            },
          },
          {
            name: "create_offer",
            description: "Create a new promotional offer",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                discountValue: { type: "number" },
                discountType: { type: "string", enum: ["PERCENTAGE", "FIXED_AMOUNT"] },
                couponCode: { type: "string" },
              },
              required: ["title", "discountValue"],
            },
          },
        ],
      };
    });

    // Handle Resources (empty list)
    mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [],
    }));

    // Handle Prompts (empty list)
    mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [],
    }));

    // Handle actual tool execution
    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;

      try {
        const entityId = session.entityId;

        if (name === "get_weather") {
          const location = (args as any).location || "Earth";
          return {
            content: [
              {
                type: "text",
                text: `Weather in ${location}: Sunny (Diagnostic)`,
              },
            ],
          };
        }

        if (!entityId) {
          throw new Error(
            "Unauthorized: No entity context found for this MCP session.",
          );
        }

        log.info(`MCP Tool Call: ${name}`, {
          entityId,
          args,
          sessionId: session.sessionId,
        });

        const result = await executeAction(
          name as any,
          args,
          entityId,
          session.region,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        log.error(`MCP Tool Execution Error: ${name}`, {
          error: error.message,
          sessionId: session.sessionId,
        });
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });

    mcpServer.onerror = (error) => {
      log.error("MCP Server Error", {
        error: error.message,
        sessionId: session.sessionId,
      });
    };

    return mcpServer;
  };

  // Track active sessions for SSE
  interface MCPSession {
    transport: SSEServerTransport;
    server: Server;
    entityId: string;
    region: DatabaseRegion;
    connectedAt: Date;
  }
  const mcpSessions = new Map<string, MCPSession>();
  const instanceId = Math.random().toString(36).substring(2, 8);

  const handleSSE = async (req: Request, res: Response) => {
    // Auth check (Bearer token or ?token= query param)
    const authHeader = req.headers.authorization || req.query.token;
    if (!authHeader) {
      log.warn("Unauthorized MCP SSE attempt", { instanceId });
      return res.status(401).send("Unauthorized");
    }

    const apiKey = String(authHeader).replace("Bearer ", "");
    const result = await findMCPKeyAcrossRegions(apiKey);

    if (!result || result.keyRecord.status !== "active") {
      log.warn("Invalid API Key for MCP SSE", {
        apiKey: apiKey.substring(0, 10) + "...",
        instanceId,
      });
      return res.status(401).send("Invalid API Key");
    }

    const { keyRecord, region } = result;

    // Stable session ID based on API Key
    const sessionId = crypto
      .createHash("md5")
      .update(apiKey)
      .digest("hex")
      .substring(0, 12);

    // Use relative URL for the endpoint to avoid host/protocol mismatch issues
    const endpointUrl = `/messages?sessionId=${sessionId}`;

    // Standard SSE headers to prevent buffering
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Reflect protocol version if provided
    const protocolVersion = req.headers["mcp-protocol-version"];
    if (protocolVersion) {
      res.setHeader("mcp-protocol-version", String(protocolVersion));
    }

    const transport = new SSEServerTransport(endpointUrl, res);

    const sessionData = {
      entityId: keyRecord.entityId,
      apiKey: apiKey,
      sessionId,
      region,
    };

    // Attach context to the transport instance (optional, for debugging)
    (transport as any).session = sessionData;

    // Create a fresh server instance for every connection to ensure clean state
    // and avoid "Already connected" or handler wiping issues.
    const mcpServer = createMCPServer(sessionData);

    // Store session data including the server instance
    mcpSessions.set(sessionId, {
      transport,
      server: mcpServer,
      entityId: keyRecord.entityId,
      region,
      connectedAt: new Date(),
    });

    try {
      await mcpServer.connect(transport);
    } catch (error: any) {
      log.error("Failed to connect MCP server to transport", {
        error: error.message,
        sessionId,
      });
      return res.status(500).send("MCP Connection Failed");
    }

    transport.onclose = () => {
      log.info("MCP SSE connection closed", {
        sessionId,
        entityId: keyRecord.entityId,
        instanceId,
      });
      
      const current = mcpSessions.get(sessionId);
      if (current && current.transport === transport) {
        mcpSessions.delete(sessionId);
      }
    };

    log.info("New MCP SSE connection", {
      sessionId,
      entityId: keyRecord.entityId,
      instanceId,
      endpointUrl,
      apiKey: apiKey.substring(0, 8) + "...",
    });
  };

  // --- Discovery & Well-Known Endpoints ---
  app.get("/.well-known/oauth-authorization-server", (req, res) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const baseUrl = `${protocol}://${req.headers["host"] || req.get("host")}`;
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
    });
  });

  app.get("/.well-known/oauth-protected-resource", (req, res) => {
    res.json({
      scopes_supported: ["mcp"],
    });
  });

  // MCP Message routes MUST be defined before express.json()
  // because the SSEServerTransport reads the request stream directly.
  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = String(req.query.sessionId);
    let session = mcpSessions.get(sessionId);

    // Fallback: Try to derive sessionId from auth token if query param is missing
    if (!session) {
      const authHeader = req.headers.authorization || req.query.token;
      if (authHeader) {
        const apiKey = String(authHeader).replace("Bearer ", "").trim();
        const derivedId = crypto
          .createHash("md5")
          .update(apiKey)
          .digest("hex")
          .substring(0, 12);
        session = mcpSessions.get(derivedId);
      }
    }

    if (!session || !session.transport) {
      log.error("MCP message received for unknown session", {
        sessionId,
        instanceId,
        path: req.path,
        hasSessionInMap: !!mcpSessions.get(sessionId),
      });
      return res.status(400).send("Unknown session");
    }

    try {
      log.info("Handling MCP POST message", {
        sessionId,
        path: req.path,
        instanceId,
      });
      await session.transport.handlePostMessage(req, res);
    } catch (error: any) {
      log.error("Error handling MCP POST message", {
        error: error.message,
        sessionId,
      });
      if (!res.headersSent) {
        res.status(500).send("Internal error");
      }
    }
  });

  // Support GET on /messages for probing/heartbeats from some clients
  app.get("/messages", (req, res) => {
    const sessionId = req.query.sessionId;
    const session = sessionId ? mcpSessions.get(String(sessionId)) : null;
    
    res.json({
      status: session ? "active" : "unknown",
      sessionId,
      message: "This endpoint is for MCP POST messages",
    });
  });

  app.get("/sse", handleSSE);

  // Handle Root URL for clients (GET for SSE, POST for messages)
  app.all("/", async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || req.query.token;
    const querySessionId = req.query.sessionId as string;

    if (
      req.method === "GET" &&
      (req.headers.accept?.includes("text/event-stream") || req.query.sse === "true")
    ) {
      return handleSSE(req, res);
    }

    if (req.method === "POST") {
      let sessionId = querySessionId;

      if (!sessionId && authHeader) {
        const apiKey = String(authHeader).replace("Bearer ", "").trim();
        sessionId = crypto
          .createHash("md5")
          .update(apiKey)
          .digest("hex")
          .substring(0, 12);
      }

      if (sessionId) {
        const session = mcpSessions.get(sessionId);
        if (session && session.transport) {
          log.info("Mapping root POST to active session", {
            sessionId,
            instanceId,
            path: req.path,
            method: req.method,
            contentType: req.headers["content-type"],
          });
          return session.transport.handlePostMessage(req, res);
        }
      }

      log.warn("MCP POST received on root path - no active session found", {
        instanceId,
        sessionId,
        hasAuth: !!authHeader,
        querySessionId,
        path: req.path,
        activeSessions: mcpSessions.size,
        availableSessionIds: Array.from(mcpSessions.keys()),
      });
      return res.status(404).json({ 
        error: "No active MCP session",
        suggestion: "Ensure SSE connection is established first",
        sessionId,
        instanceId
      });
    }

    if (req.method === "GET") {
      return res.json({
        status: "ok",
        service: "mcp",
        instanceId,
        connectVia: "/sse",
        activeSessions: mcpSessions.size,
      });
    }

    next();
  });

  app.get("/favicon.ico", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#6366f1" />
            <stop offset="100%" style="stop-color:#a855f7" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="20" fill="#0f172a"/>
        <path d="M30 30 H70 V40 H55 V80 H45 V40 H30 Z" fill="url(#g)"/>
      </svg>
    `);
  });

  app.get("/debug", (req: Request, res: Response) => {
    const sessions = Array.from(mcpSessions.keys()).map((id) => {
      const s = mcpSessions.get(id);
      return {
        sessionId: id,
        entityId: s?.entityId,
        region: s?.region,
        connectedAt: s?.connectedAt,
      };
    });
    res.json({
      instanceId,
      activeSessions: sessions.length,
      sessionDetails: sessions,
    });
  });

  app.get("/tools", (req: Request, res: Response) => {
    // Direct tool listing for debugging
    res.json({
      tools: [
        {
          name: "create_feed",
          description: "Create a new community feed post",
        },
        { name: "create_poll", description: "Create a new interactive poll" },
        {
          name: "moderate_content",
          description: "Review and moderate content",
        },
        {
          name: "provision_wordpress",
          description: "Provision WordPress instance",
        },
      ],
    });
  });

  // Standard middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", service: "mcp", instanceId });
  });

  // OAuth 2.0 Authorization Endpoint (MCP Integration)
  app.get("/authorize", async (req: Request, res: Response) => {
    try {
      const {
        response_type,
        client_id,
        redirect_uri,
        code_challenge,
        code_challenge_method,
        state,
      } = req.query;

      if (!client_id || !redirect_uri) {
        return res
          .status(400)
          .send("Missing required parameters: client_id, redirect_uri");
      }

      // Validate the client_id (which acts as the API key here) across all regions
      const result = await findMCPKeyAcrossRegions(String(client_id));

      if (!result || result.keyRecord.status !== "active") {
        return res.status(403).send("Invalid or inactive client_id");
      }

      // Generate an authorization code
      const code = `mcp_code_${Math.random().toString(36).substring(2, 15)}`;

      // Redirect back to the client (e.g., Claude Desktop)
      const redirectUrl = new URL(String(redirect_uri));
      redirectUrl.searchParams.append("code", code);
      if (state) {
        redirectUrl.searchParams.append("state", String(state));
      }

      return res.redirect(redirectUrl.toString());
    } catch (error: any) {
      log.error("Error in /authorize route", { error: error.message });
      return res.status(500).send("Internal Server Error");
    }
  });

  // OAuth 2.0 Token Endpoint (MCP PKCE Token Exchange)
  app.post("/token", async (req: Request, res: Response) => {
    try {
      const { grant_type, code } = req.body;
      let clientId = req.body.client_id;

      // Claude backend and most standard OAuth clients may pass client_id in the Authorization basic header
      if (!clientId && req.headers.authorization?.startsWith("Basic ")) {
        const b64auth = req.headers.authorization.split(" ")[1];
        const [user] = Buffer.from(b64auth, "base64").toString().split(":");
        clientId = user;
      }

      if (!clientId) {
        return res.status(400).json({ error: "missing_client_id" });
      }

      // Validate the API key exists across all regions
      const result = await findMCPKeyAcrossRegions(String(clientId));

      if (!result || result.keyRecord.status !== "active") {
        return res.status(403).json({ error: "invalid_client" });
      }

      // Return the token. We use the client_id itself as the Bearer token
      return res.json({
        access_token: String(clientId),
        token_type: "Bearer",
        expires_in: 31536000, // Long-lived token for MCP
      });
    } catch (error: any) {
      log.error("Error in /token route", { error: error.message });
      return res.status(500).json({ error: "server_error" });
    }
  });

  // MCP Protocol Execution Router (Legacy/Direct endpoint)
  app.use("/execute", executeRouter);

  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    formatError: (error) => {
      log.error("GraphQL error (mcp)", {
        message: error.message,
        path: error.path,
        extensions: error.extensions,
      });
      return error;
    },
  });

  await server.start();
  log.info("Apollo Server started (mcp)");

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }): Promise<any> => {
        return req;
      },
    }),
  );

  app.use(errorLogger);

  app.listen(PORT, () => {
    log.info(`MCP server running`, {
      port: PORT,
      graphqlPath: "/graphql",
      ssePath: "/sse",
      instanceId,
    });
  });
}

startServer().catch((error) => {
  log.error("Failed to start mcp server", { error: error.message });
  process.exit(1);
});

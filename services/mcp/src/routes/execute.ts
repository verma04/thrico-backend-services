import express, { Request, Response, Router } from "express";
import { getDb, mcpKeys, mcpLogs } from "@thrico/database";
import { eq } from "drizzle-orm";
import { MCPRequestSchema, MCPResponse } from "../protocol";
import { log } from "@thrico/logging";
import { executeAction } from "../actions";
import { findMCPKeyAcrossRegions } from "../utils/auth";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Missing or invalid authorization header",
    });
  }

  const apiKey = authHeader.split(" ")[1];

  try {
    // 1. Validate API Key across all regions
    const authResult = await findMCPKeyAcrossRegions(apiKey);

    if (!authResult) {
      return res.status(401).json({ success: false, error: "Invalid API key" });
    }

    const { keyRecord, db, region } = authResult;

    if (keyRecord.status !== "active") {
      return res
        .status(403)
        .json({ success: false, error: "API key is not active" });
    }

    // 2. Validate Request Body
    const validation = MCPRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request format",
        details: validation.error.format(),
      });
    }

    const { action, data } = validation.data;

    // 3. Check Permissions
    if (!keyRecord.permissions.includes(action)) {
      return res.status(403).json({
        success: false,
        error: `Key does not have permission for action: ${action}`,
      });
    }

    // 4. Execute Action
    let result: MCPResponse;
    const entityId = keyRecord.entityId;

    try {
      log.info(`Executing MCP action: ${action}`, { entityId, data });

      // Delegate to the action registry with region awareness
      const actionData = await executeAction(action, data, entityId, region, validation.data.meta);

      result = {
        success: true,
        message: `Action '${action}' accepted and processed`,
        data: {
          action,
          entityId,
          timestamp: new Date().toISOString(),
          ...actionData,
        },
      };

      // 5. Log Success
      await db.insert(mcpLogs).values({
        entityId,
        actionName: action,
        status: "success",
        triggerSource: "AI",
        payload: req.body,
        result: result,
      });
    } catch (error: any) {
      log.error(`MCP execution failed: ${action}`, { error: error.message });
      result = { success: false, error: error.message };

      // 5. Log Failure
      await db.insert(mcpLogs).values({
        entityId,
        actionName: action,
        status: "failed",
        triggerSource: "AI",
        payload: req.body,
        result: { error: error.message },
      });
    }

    return res.json(result);
  } catch (error: any) {
    log.error("MCP Protocol internal error", { error: error.message });
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

export const executeRouter: Router = router;

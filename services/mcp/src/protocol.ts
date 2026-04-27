import { z } from "zod";

export const MCPActionSchema = z.enum([
  "create_feed",
  "create_poll",
  "create_community",
  "create_listing",
  "create_offer",
]);

export type MCPAction = z.infer<typeof MCPActionSchema>;

export const MCPRequestSchema = z.object({
  action: MCPActionSchema,
  data: z.record(z.any()),
  meta: z
    .object({
      userId: z.string().optional(),
      entityId: z.string().optional(),
      role: z.string().optional(),
    })
    .optional(),
});

export type MCPRequest = z.infer<typeof MCPRequestSchema>;

export const MCPResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.record(z.any()).optional(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export type MCPResponse = z.infer<typeof MCPResponseSchema>;

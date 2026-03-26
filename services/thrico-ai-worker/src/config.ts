import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
    queue: "PROCESS_AI_ANALYSIS",
  },
  database: {
    url: process.env.DATABASE_URL || "",
  },
  ai: {
    maxConcurrentJobs: parseInt(process.env.MAX_AI_JOBS || "5", 10),
  },
};

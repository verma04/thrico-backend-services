import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
    queue: "PROCESS_MOMENT",
  },
  s3: {
    accessKeyId:
      process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey:
      process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
    bucket: process.env.S3_BUCKET || "thrico-storage",
    region: process.env.S3_REGION || "ap-south-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
  },
  database: {
    url: process.env.DATABASE_URL || "",
  },
  worker: {
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || "3", 10),
  },
};

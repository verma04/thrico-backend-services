export const config = {
  s3: {
    accessKeyId:
      process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey:
      process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
    bucket: process.env.S3_BUCKET || "thrico-storage",
    region: process.env.S3_REGION || "ap-south-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    uploadExpiry: parseInt(process.env.UPLOAD_URL_EXPIRY_SECONDS || "3600", 10),
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
  },
  database: {
    url: process.env.DATABASE_URL || "",
  },
};

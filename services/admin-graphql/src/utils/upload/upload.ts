import moment from "moment";
import sharp from "sharp";
import AWS from "aws-sdk";
import { streamToBuffer } from "./streamToBuffer";
import { storageFiles } from "@thrico/database";
import { log } from "@thrico/logging";

require("aws-sdk/lib/maintenance_mode_message").suppress = true;

const upload = async (
  file: Promise<any>,
  entityId: string,
  db?: any,
  userId?: string,
  module: any = "GENERAL",
) => {
  const s3 = new AWS.S3({
    region: process.env.S3_REGION || "ap-south-1",
    accessKeyId: process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey:
      process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  });
  const BUCKET_NAME = process.env.S3_BUCKET || "thrico-storage";
  const { stream, filename, mimetype, createReadStream } = await file;

  const date = moment().format("YYYYMMDD");
  const randomString = Math.random().toString(36).substring(2, 7);

  const newFilename = `${entityId}/${module.toLowerCase()}/${date}-${randomString}.webp`;
  const imageBuffer = await streamToBuffer(createReadStream());
  const webpBuffer = await sharp(imageBuffer)
    .toFormat("webp")
    .webp({ quality: 20 })
    .toBuffer();

  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: newFilename,
      Body: webpBuffer,
      ContentType: "image/webp",
    };
    const data1 = await s3.upload(params).promise();

    if (db) {
      try {
        await db.insert(storageFiles).values({
          entityId,
          module,
          fileKey: newFilename,
          uploadedBy: userId,
          sizeInBytes: webpBuffer.length,
        });
        log.info("Storage file record created:", {
          entityId,
          module,
          fileKey: newFilename,
        });
      } catch (dbError) {
        log.error("Failed to save storage file record:", { dbError });
      }
    }

    return `${newFilename}`;
  } catch (error) {
    console.log(error);
  }
};

export default upload;

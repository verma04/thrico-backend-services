import moment from "moment";
import AWS from "aws-sdk";
require("aws-sdk/lib/maintenance_mode_message").suppress = true;
import sharp from "sharp";
import { log } from "@thrico/logging";

import { streamToBuffer } from "./streamToBuffer";

interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => NodeJS.ReadableStream;
}

const s3 = new AWS.S3({
  region: process.env.S3_REGION || "ap-south-1",
  accessKeyId: process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET_NAME = process.env.S3_BUCKET || "thrico-storage";

import { storageFiles } from "@thrico/database";

const uploadImageToFolder = async (
  id: string,
  images: Promise<FileUpload>[],
  db?: any,
  userId?: string,
  module: any = "GENERAL",
) => {
  if (!images || images.length === 0) {
    return [];
  }

  log.debug("S3 Config Check:", {
    hasS3Key: !!(process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID),
    hasS3Secret: !!(
      process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY
    ),
    s3KeyLength:
      (process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID)?.length || 0,
    s3SecretLength:
      (process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY)
        ?.length || 0,
    bucket: BUCKET_NAME,
  });

  try {
    const uploadPromises = images.map(async (imagePromise) => {
      const image = await imagePromise;
      const { filename, createReadStream } = image;

      const date = moment().format("YYYYMMDD");
      const randomString = Math.random().toString(36).substring(2, 7);
      const newFilename = `${id}/${module.toLowerCase()}/${date}-${randomString}.webp`;

      const imageBuffer = await streamToBuffer(createReadStream());

      const sharpImage = await sharp(imageBuffer)
        .toFormat("webp")
        .webp()
        .toBuffer();

      const params = {
        Bucket: BUCKET_NAME,
        Key: newFilename,
        Body: sharpImage,
        ContentType: "image/webp",
      };

      const uploaded = await s3.upload(params).promise();

      if (db) {
        try {
          await db.insert(storageFiles).values({
            entityId: id,
            module,
            fileKey: newFilename,
            uploadedBy: userId,
            sizeInBytes: sharpImage.length,
          });
          log.info("Storage file record created:", {
            entityId: id,
            module,
            fileKey: newFilename,
          });
        } catch (dbError) {
          log.error("Failed to save storage file record:", { dbError });
        }
      }

      return {
        originalFilename: filename,
        url: `${newFilename}`,
      };
    });

    const uploadedImages = await Promise.all(uploadPromises);

    log.info("Uploaded Images:", uploadedImages);
    return uploadedImages;
  } catch (error) {
    log.error("Failed to upload images:", { error });
    throw new Error("Image upload failed.");
  }
};

export default uploadImageToFolder;

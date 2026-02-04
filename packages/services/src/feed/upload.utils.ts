// Upload utilities for feed images using DigitalOcean Spaces
import moment from "moment";
import sharp from "sharp";
import AWS from "aws-sdk";
import { log } from "@thrico/logging";
import { streamToBuffer } from "../stremToBuffer";
require("aws-sdk/lib/maintenance_mode_message").suppress = true;

/**
 * Uploads an array of image uploads to DigitalOcean Spaces, converting them to WebP.
 * Returns an array of objects containing the generated file path for each image.
 */
export const uploadFeedImage = async (entityId: string, images: any[]) => {
  if (!images || images.length === 0) {
    return [] as { file: string }[];
  }

  const s3 = new AWS.S3({
    endpoint: "blr1.digitaloceanspaces.com",
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  });

  log.info("S3 Config Check (Feed):", {
    hasSpacesKey: !!process.env.SPACES_KEY,
    hasSpacesSecret: !!process.env.SPACES_SECRET,
    spacesKeyLength: process.env.SPACES_KEY?.length || 0,
    spacesSecretLength: process.env.SPACES_SECRET?.length || 0,
    endpoint: "blr1.digitaloceanspaces.com",
    bucket: "thrico",
  });

  try {
    const img = images.map((set) => {
      const date = moment().format("YYYYMMDD");
      const randomString = Math.random().toString(36).substring(2, 7);
      const newFilename = `${entityId}/${date}-${randomString}.webp`;
      return { img: set, file: newFilename };
    });

    await Promise.all(
      img.map(async (set) => {
        // Handle graphql-upload-minimal structures (some wrap in promise)
        const resolved = await (set.img.promise || set.img);
        const { filename, mimetype, createReadStream } = resolved;

        if (typeof createReadStream !== "function") {
          log.error("Invalid upload object structure", { resolved });
          throw new Error("createReadStream is not a function");
        }

        const imageBuffer = await streamToBuffer(createReadStream());
        const sharpImage = await sharp(imageBuffer)
          .toFormat("webp")
          .webp({ quality: 20 })
          .toBuffer();
        const params = {
          Bucket: "thrico",
          Key: set.file,
          Body: sharpImage,
          ACL: "public-read",
          ContentType: mimetype,
        };
        await s3.upload(params).promise();
        return { filename };
      }),
    );
    return img;
  } catch (error) {
    log.error("Error uploading feed images", { error, entityId });
    throw error;
  }
};

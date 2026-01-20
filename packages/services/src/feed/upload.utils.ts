// Upload utilities for feed images using DigitalOcean Spaces
import moment from "moment";
import sharp from "sharp";
import AWS from "aws-sdk";
import { log } from "@thrico/logging";
require("aws-sdk/lib/maintenance_mode_message").suppress = true;

const s3 = new AWS.S3({
  endpoint: "blr1.digitaloceanspaces.com",
  accessKeyId: process.env.SPACES_KEY,
  secretAccessKey: process.env.SPACES_SECRET,
});

/**
 * Uploads an array of image uploads to DigitalOcean Spaces, converting them to WebP.
 * Returns an array of objects containing the generated file path for each image.
 */
export const uploadFeedImage = async (entityId: string, images: any[]) => {
  if (!images || images.length === 0) {
    return [] as { file: string }[];
  }
  try {
    const img = images.map((set) => {
      const date = moment().format("YYYYMMDD");
      const randomString = Math.random().toString(36).substring(2, 7);
      const newFilename = `${entityId}/${date}-${randomString}`;
      return { img: set, file: newFilename };
    });

    const streamToBuffer = (stream: any) => {
      const chunks: Buffer[] = [];
      return new Promise<Buffer>((resolve, reject) => {
        stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err: any) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
      });
    };

    await Promise.all(
      img.map(async (set) => {
        const { filename, mimetype, createReadStream } = await set.img;
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
      })
    );
    return img;
  } catch (error) {
    log.error("Error uploading feed images", { error, entityId });
    throw error;
  }
};

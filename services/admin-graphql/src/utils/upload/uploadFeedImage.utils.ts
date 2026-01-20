import moment from "moment";

import sharp from "sharp";
import AWS from "aws-sdk";
require("aws-sdk/lib/maintenance_mode_message").suppress = true;
const s3 = new AWS.S3({
  endpoint: "blr1.digitaloceanspaces.com",
  accessKeyId: process.env.SPACES_KEY,
  secretAccessKey: process.env.SPACES_SECRET,
});
const uploadFeedImage = async (id: string, images: any[]) => {
  if (!images || images.length === 0) {
    return [];
  }

  try {
    const streamToBuffer = (stream: any): Promise<Buffer> => {
      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        stream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err: any) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
      });
    };

    const uploadPromises = images.map(async (imagePromise: any) => {
      const { mimetype, createReadStream } = await imagePromise;

      const date = moment().format("YYYYMMDD");
      const randomString = Math.random().toString(36).substring(2, 7);
      const newFilename = `${id}/${date}-${randomString}`;

      const imageBuffer = await streamToBuffer(createReadStream());

      const sharpImage = await sharp(imageBuffer)
        .toFormat("webp")
        .webp({ quality: 20 })
        .toBuffer();

      const params = {
        Bucket: "thrico",
        Key: newFilename,
        Body: sharpImage,
        ACL: "public-read",
        ContentType: "image/webp", // Force type to webp since we converted it
      };

      await s3.upload(params).promise();

      return {
        url: newFilename,
        type: "image/webp",
      };
    });

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Error in uploadFeedImage:", error);
    throw error; // Rethrow to handle it in the resolver
  }
};

export default uploadFeedImage;

import moment from "moment";
import AWS from "aws-sdk";
require("aws-sdk/lib/maintenance_mode_message").suppress = true;
import sharp from "sharp";
import { streamToBuffer } from "./streamToBuffer";

interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => NodeJS.ReadableStream;
}

const s3 = new AWS.S3({
  endpoint: "blr1.digitaloceanspaces.com",
  accessKeyId: process.env.SPACES_KEY,
  secretAccessKey: process.env.SPACES_SECRET,
});

const BUCKET_NAME = "thrico";

const uploadImageToFolder = async (
  id: string,
  images: Promise<FileUpload>[],
) => {
  if (!images || images.length === 0) {
    return [];
  }

  console.log("S3 Config Check:", {
    hasSpacesKey: !!process.env.SPACES_KEY,
    hasSpacesSecret: !!process.env.SPACES_SECRET,
    spacesKeyLength: process.env.SPACES_KEY?.length || 0,
    spacesSecretLength: process.env.SPACES_SECRET?.length || 0,
  });

  try {
    const uploadPromises = images.map(async (imagePromise) => {
      const image = await imagePromise;
      const { filename, createReadStream } = image;

      const date = moment().format("YYYYMMDD");
      const randomString = Math.random().toString(36).substring(2, 7);
      const newFilename = `${id}/${date}-${randomString}.webp`;

      const imageBuffer = await streamToBuffer(createReadStream());

      const sharpImage = await sharp(imageBuffer)
        .toFormat("webp")
        .webp()
        .toBuffer();

      const params = {
        Bucket: BUCKET_NAME,
        Key: newFilename,
        Body: sharpImage,
        ACL: "public-read",
        ContentType: "image/webp",
      };

      const uploaded = await s3.upload(params).promise();

      return {
        originalFilename: filename,
        url: `${newFilename}`,
      };
    });

    const uploadedImages = await Promise.all(uploadPromises);

    console.log("Uploaded Images:", uploadedImages);
    return uploadedImages;
  } catch (error) {
    console.error("Failed to upload images:", error);
    throw new Error("Image upload failed.");
  }
};

export default uploadImageToFolder;

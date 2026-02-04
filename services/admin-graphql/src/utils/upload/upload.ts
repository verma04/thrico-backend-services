import moment from "moment";
import sharp from "sharp";
import AWS from "aws-sdk";
import { streamToBuffer } from "./streamToBuffer";
require("aws-sdk/lib/maintenance_mode_message").suppress = true;

const upload = async (file: Promise<any>) => {
  const s3 = new AWS.S3({
    endpoint: "blr1.digitaloceanspaces.com",
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  });
  const { stream, filename, mimetype, createReadStream } = await file;

  const date = moment().format("YYYYMMDD");
  const randomString = Math.random().toString(36).substring(2, 7);

  const newFilename = `${date}-${randomString}.webp`;
  const imageBuffer = await streamToBuffer(createReadStream());
  const webpBuffer = await sharp(imageBuffer)
    .toFormat("webp")
    .webp({ quality: 20 })
    .toBuffer();

  try {
    const params = {
      Bucket: "thrico",
      Key: newFilename,
      Body: webpBuffer,
      ACL: "public-read",
      ContentType: "image/webp",
    };
    const data1 = await s3.upload(params).promise();
    const { Location } = data1;

    return `https://cdn.thrico.network/${newFilename}`;
  } catch (error) {
    console.log(error);
  }
};

export default upload;

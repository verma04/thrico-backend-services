import moment from "moment";
import sharp from "sharp";
import AWS from "aws-sdk";

const streamToBuffer = (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
};

// @ts-ignore
require("aws-sdk/lib/maintenance_mode_message").suppress = true;

const upload = async (file: any) => {
  const s3 = new AWS.S3({
    endpoint: "blr1.digitaloceanspaces.com",
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  });

  // Handle graphql-upload-minimal structures
  // Some clients wrap it in a promise, some provide it directly
  const resolvedFile = await (file.promise || file);
  const { createReadStream, filename, mimetype } = resolvedFile;

  if (typeof createReadStream !== "function") {
    console.error("Upload object structure:", resolvedFile);
    throw new Error(
      "createReadStream is not a function on the provided upload object",
    );
  }

  const date = moment().format("YYYYMMDD");
  const randomString = Math.random().toString(36).substring(2, 7);

  const newFilename = `${date}-${randomString}.webp`;

  try {
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
      ContentType: "image/webp",
    };

    const data = await s3.upload(params).promise();
    const { Location } = data;

    return newFilename;
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

const uploadFile = async (file: any) => {
  const s3 = new AWS.S3({
    endpoint: "blr1.digitaloceanspaces.com",
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  });

  const resolvedFile = await (file.promise || file);
  const { createReadStream, filename, mimetype } = resolvedFile;

  if (typeof createReadStream !== "function") {
    console.error("Upload object structure:", resolvedFile);
    throw new Error(
      "createReadStream is not a function on the provided upload object",
    );
  }

  const date = moment().format("YYYYMMDD");
  const randomString = Math.random().toString(36).substring(2, 7);
  const ext = filename.split(".").pop();
  const newFilename = `${date}-${randomString}.${ext}`;

  try {
    const fileBuffer = await streamToBuffer(createReadStream());

    const params = {
      Bucket: "thrico",
      Key: newFilename,
      Body: fileBuffer,
      ACL: "public-read",
      ContentType: mimetype,
    };

    const data = await s3.upload(params).promise();
    return newFilename;
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

export { upload, uploadFile };

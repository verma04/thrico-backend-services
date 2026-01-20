import moment from "moment";
import AWS from "aws-sdk";
import { streamToBuffer } from "../stremToBuffer";
import { Buffer } from "buffer";
// @ts-ignore
require("aws-sdk/lib/maintenance_mode_message").suppress = true;

const uploadVideo = async (file: any) => {
  const s3 = new AWS.S3({
    endpoint: "blr1.digitaloceanspaces.com",
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  });

  // Handle graphql-upload-minimal structures
  const resolvedFile = await (file.promise || file);
  const { createReadStream, filename, mimetype } = resolvedFile;

  if (typeof createReadStream !== "function") {
    console.error("Video upload object structure:", resolvedFile);
    throw new Error(
      "createReadStream is not a function on the provided video upload object"
    );
  }

  const date = moment().format("YYYYMMDD");
  const randomString = Math.random().toString(36).substring(2, 7);

  // Get file extension from original filename or mimetype
  const getFileExtension = (filename: string, mimetype: string) => {
    if (filename && filename.includes(".")) {
      return filename.split(".").pop();
    }
    // Fallback to mimetype mapping
    const mimetypeMap: Record<string, string> = {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/ogg": "ogv",
      "video/avi": "avi",
      "video/mov": "mov",
      "video/quicktime": "mov",
    };
    return mimetypeMap[mimetype] || "mp4";
  };

  const fileExtension = getFileExtension(filename, mimetype);
  const newFilename = `videos/${date}-${randomString}.${fileExtension}`;

  try {
    const videoBuffer = (await streamToBuffer(createReadStream())) as Buffer;

    if (!videoBuffer || videoBuffer.length === 0) {
      throw new Error("Failed to convert video stream to buffer");
    }

    const params = {
      Bucket: "thrico",
      Key: newFilename,
      Body: videoBuffer,
      ACL: "public-read",
      ContentType: mimetype,
      Metadata: {
        "original-filename": filename,
        "upload-date": date,
        "file-type": "video",
      },
    };

    const data = await s3.upload(params).promise();
    const { Location } = data;

    return {
      filename: newFilename,
      url: Location,
      size: videoBuffer.length,
      mimetype: mimetype,
    };
  } catch (error: any) {
    console.error("Video upload error:", error);
    throw new Error(`Failed to upload video: ${error.message}`);
  }
};

export default uploadVideo;

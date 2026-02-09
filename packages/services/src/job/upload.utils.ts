import AWS from "aws-sdk";
import { log } from "@thrico/logging";
import moment from "moment";

const streamToBuffer = (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
};

export const uploadPdf = async (file: any) => {
  const s3 = new AWS.S3({
    endpoint: "blr1.digitaloceanspaces.com",
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  });

  const resolvedFile = await (file.promise || file);
  const { createReadStream, filename, mimetype } = resolvedFile;

  if (mimetype !== "application/pdf") {
    throw new Error("Only PDF files are allowed.");
  }

  if (typeof createReadStream !== "function") {
    log.error("Upload object structure:", resolvedFile);
    throw new Error(
      "createReadStream is not a function on the provided upload object",
    );
  }

  const date = moment().format("YYYYMMDD");
  const randomString = Math.random().toString(36).substring(2, 7);
  const newFilename = `resumes/${date}-${randomString}.pdf`;

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
    // Return full URL or just filename depending on requirement.
    // storage.thrico.network is likely the CDN or direct link.
    // Based on other files, it seems just returning filename or path is common,
    // but let's check what uploadFile returned. It returned newFilename.
    // However, for resumes, a full URL might be better if not constructed client side.
    // Existing uploadFile returned newFilename.
    // I will return newFilename to be consistent, but let's see if we need the full URL.
    // The previous implementation utilized uploadFile which returned newFilename.

    // Actually, looking at uploadFeedImage, it returns { file: newFilename }.
    // I will return the filename, and let the service construct the URL if needed,
    // or just store the filename if that's the convention.
    // Wait, uploadFile returned newFilename.
    // I will return newFilename.

    return newFilename;
  } catch (error: any) {
    log.error("Upload error:", error);
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }
};

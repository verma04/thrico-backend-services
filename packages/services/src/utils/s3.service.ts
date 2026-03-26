import AWS from "aws-sdk";
import { log } from "@thrico/logging";

export class S3Service {
  private static bucket =
    process.env.S3_BUCKET || process.env.AWS_BUCKET_NAME || "thrico-storage";

  private static s3 = new AWS.S3({
    accessKeyId:
      process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey:
      process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1",
    endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT || undefined,
    signatureVersion: "v4",
  });

  private static uploadExpiry = parseInt(
    process.env.UPLOAD_URL_EXPIRY_SECONDS || "3600",
    10,
  );

  static getBucket(): string {
    return this.bucket;
  }

  static async getPreSignedPutUrl(
    key: string,
    contentType: string,
  ): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: this.uploadExpiry,
      ContentType: contentType,
    };

    return this.s3.getSignedUrlPromise("putObject", params);
  }

  static getPublicUrl(key: string): string {
    const endpointStr = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT;
    if (endpointStr) {
      const endpoint = endpointStr.replace(/^https?:\/\//, "");
      // For Custom S3/DigitalOcean: https://bucket.endpoint/key
      return `https://${this.bucket}.${endpoint}/${key}`;
    }
    // Standard AWS S3 URL: https://bucket.s3.region.amazonaws.com/key
    const region =
      process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1";
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  static async checkFileExists(key: string): Promise<boolean> {
    try {
      await this.s3
        .headObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();
      return true;
    } catch (error: any) {
      if (error.code === "NotFound" || error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  static async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      return await this.s3
        .headObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();
    } catch (error: any) {
      throw error;
    }
  }

  static async makePublic(key: string): Promise<void> {
    // NOTE: This bucket has "Bucket owner enforced" setting, which disables ACLs.
    // Public access should be managed via Bucket Policy.
    log.warn("makePublic called but ACLs are disabled on this bucket", { key });
    /*
    try {
      await this.s3
        .putObjectAcl({
          Bucket: this.bucket,
          Key: key,
          ACL: "public-read",
        })
        .promise();
    } catch (error) {
      log.error("Failed to make object public", { key, error });
    }
    */
  }

  static async deleteObject(key: string): Promise<void> {
    try {
      await this.s3
        .deleteObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();
    } catch (error) {
      log.error("Failed to delete object from S3", { key, error });
      throw error;
    }
  }

  static async upload(
    params: AWS.S3.PutObjectRequest,
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    return this.s3.upload(params).promise();
  }
}

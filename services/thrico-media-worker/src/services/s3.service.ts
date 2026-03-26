import AWS from "aws-sdk";
import fs from "fs";
import { config } from "../config";
import { logger } from "../utils/logger";

export class S3Service {
  private static s3 = new AWS.S3({
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
    region: config.s3.region,
    endpoint: config.s3.endpoint,
    signatureVersion: "v4",
  });

  static async downloadFile(key: string, downloadPath: string): Promise<void> {
    logger.info(`Downloading file from S3: ${key} to ${downloadPath}`);
    const params = {
      Bucket: config.s3.bucket,
      Key: key,
    };

    const file = fs.createWriteStream(downloadPath);
    return new Promise((resolve, reject) => {
      this.s3
        .getObject(params)
        .createReadStream()
        .on("error", reject)
        .pipe(file)
        .on("finish", resolve)
        .on("error", reject);
    });
  }

  static async uploadFile(
    key: string,
    filePath: string,
    contentType: string,
  ): Promise<string> {
    logger.info(`Uploading file to S3: ${key} (${contentType})`);
    
    const fileStream = fs.createReadStream(filePath);
    const params = {
      Bucket: config.s3.bucket,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
    };

    await this.s3.upload(params).promise();
    return `/${key}`;
  }

  static async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    logger.info(`Uploading buffer to S3: ${key} (${contentType})`);
    const params = {
      Bucket: config.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    await this.s3.upload(params).promise();
    return `/${key}`;
  }

  static async deleteFile(key: string): Promise<void> {
    logger.info(`Deleting file from S3: ${key}`);
    const params = {
      Bucket: config.s3.bucket,
      Key: key,
    };
    await this.s3.deleteObject(params).promise();
  }
}

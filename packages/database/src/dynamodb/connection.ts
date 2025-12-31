import dynamoose from "dynamoose";
import { log } from "@thrico/logging";

export const connectDynamo = () => {
  try {
    const DYNAMODB_LOCAL = process.env.DYNAMODB_LOCAL === "true";
    const DYNAMODB_ENDPOINT =
      process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
    const AWS_REGION = process.env.AWS_REGION || "us-east-1";

    if (DYNAMODB_LOCAL) {
      log.info("Configuring Dynamoose for local DynamoDB", {
        endpoint: DYNAMODB_ENDPOINT,
      });
      dynamoose.aws.ddb.local(DYNAMODB_ENDPOINT);
    } else {
      log.info("Configuring Dynamoose for AWS DynamoDB", {
        region: AWS_REGION,
      });

      const ddb = new dynamoose.aws.ddb.DynamoDB({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
        },
        region: AWS_REGION,
      });

      dynamoose.aws.ddb.set(ddb);
    }
    log.info("Connected to DynamoDB successfully.");
  } catch (error: any) {
    log.error("Failed to connect to DynamoDB:", { error: error.message });
  }
};

export { dynamoose };
export default dynamoose;

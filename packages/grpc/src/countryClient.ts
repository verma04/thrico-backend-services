import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { log } from "@thrico/logging";
import dotenv from "dotenv";

// Load .env from monorepo root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Proto file path - different in dev vs production
const fs = require("fs");
const devProtoPath = path.resolve(__dirname, "../proto/country.proto");
const prodProtoPath = path.resolve(__dirname, "../../../proto/country.proto");
const PROTO_PATH = fs.existsSync(devProtoPath) ? devProtoPath : prodProtoPath;
const GRPC_HOST = process.env.GRPC_HOST || "localhost";
const GRPC_PORT = process.env.GRPC_PORT || "50051";

const GRPC_URL = `${GRPC_HOST}:${GRPC_PORT}`;

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const thrico = protoDescriptor.countryapi.CountryService;

export interface Country {
  code: string;
  name: string;
}

export interface CountryDetails {
  code: string;
  name: string;
  currency: string;
  taxName: string;
  taxPercentage: number;
  taxType: string;
  taxIncluded: boolean;
}

// Country gRPC client
class CountryClient {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    log.info("Initializing Country gRPC client", { address: GRPC_URL });

    this.client = new thrico(GRPC_URL, grpc.credentials.createInsecure());

    this.isConnected = true;
  }

  async getAllCountries(): Promise<Country[]> {
    return new Promise((resolve, reject) => {
      this.client.GetAllCountries({}, (error: any, response: any) => {
        if (error) {
          log.error("gRPC GetAllCountries error", { error: error.message });
          reject(error);
        } else {
          resolve(response.countries || []);
        }
      });
    });
  }

  async getCountryDetails(code: string): Promise<CountryDetails> {
    return new Promise((resolve, reject) => {
      this.client.GetCountryDetails({ code }, (error: any, response: any) => {
        if (error) {
          log.error("gRPC GetCountryDetails error", { error: error.message, code });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  close() {
    this.isConnected = false;
    log.info("Country gRPC client closed");
  }
}

// Export singleton instance
export const countryClient = new CountryClient();
export default CountryClient;

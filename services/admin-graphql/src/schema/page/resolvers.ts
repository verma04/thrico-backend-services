import uploadImageToFolder from "../../utils/upload/uploadImageToFolder.utils";
import { PAGE } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { pageClient } from "@thrico/grpc";

const pageResolvers: any = {
  Query: {
    async getAllPages(_: any, { input }: any, context: any) {
      try {
        const { value, limit } = input;

        console.log("getAllPages input:", input);

        const data: any = await pageClient.getAllPages({
          value: value || "",
          limit: limit || 10,
        });
        console.log("getAllPages data:", data);
        return data.pages;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addPage(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);
        const { name } = input;

        let logo: string | undefined = undefined;
        if (input?.logo?.file) {
          const uploaded = await uploadImageToFolder("pages", [
            input.logo.file,
          ]);
          if (uploaded && uploaded.length > 0) {
            logo = uploaded[0].url;
          }
        }

        console.log(input.logo?.file);

        // PAGE is a Dynamoose model
        const newPage = new PAGE({
          ...input,
          user: id,
          logo: logo ? logo : "defaultPageImage.png",
        });
        const data = await newPage.save();

        return data; // Dynamoose document usually behaves like JSON on serialization
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { pageResolvers };

// import { db } from "@thrico/database";

import { GraphQLError } from "graphql";

import { checkEmail } from "../../utils/mail/checkmail.utils";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { razorpay, stripe } from "@thrico/database";
import { eq } from "drizzle-orm";
// import upload from "../../utils/upload/upload.utils"; // Not used in this file

const paymentResolvers = {
  Query: {
    async checkPaymentDetails(_: any, { input }: any, context: any) {
      try {
        const { db, id } = await checkAuth(context);

        const findUser = await db.query.users.findFirst({
          where: (user: any, { eq }: any) => eq(user.id, id),
          with: {
            entity: {
              with: {
                razorpay: true,
                stripe: true,
              },
            },
          },
        });

        console.log(findUser);

        return {
          enabledRazorpay: findUser?.entity?.razorpay?.isEnabled,
          enabledStripe: findUser?.entity?.stripe?.isEnabled,
          razorpayKeyId: findUser?.entity?.razorpay?.keyID,
          razorpayKeySecret: findUser?.entity?.razorpay?.keySecret,
          stripeKeyId: findUser?.entity?.stripe?.keyID,
          stripeKeySecret: findUser?.entity?.stripe?.keySecret,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addPaymentDetails(_: any, { input }: any, context: any) {
      try {
        const { db, id } = await checkAuth(context);

        const findUser = await db.query.users.findFirst({
          where: (user: any, { eq }: any) => eq(user.id, id),
          with: {
            entity: true,
          },
        });
        console.log(input);

        // Ensure entity and id exist before proceeding
        if (!findUser || !findUser.entity || !findUser.entity.id) {
          throw new GraphQLError("Entity not found for user", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        if (input.enabledRazorpay) {
          await db
            .update(razorpay)
            .set({
              keyID: input.razorpayKeyId,
              isEnabled: input.enabledRazorpay,
              keySecret: input.razorpayKeySecret,
            })
            .where(eq(razorpay.entity, findUser.entity.id)); // relations check
        }

        if (input.enabledStripe) {
          await db
            .update(stripe)
            .set({
              keyID: input.stripeKeyId,
              keySecret: input.stripeKeySecret,
              isEnabled: input.enabledStripe,
            })
            .where(eq(stripe.entity, findUser.entity.id));
        }

        return {
          success: true,
        };

        // const createRazorpay = await db
        //   .insert(razorpay)
        //   .values({
        //     entity: findUser.entity.id,
        //     keyID: input.keyId,
        //     keySecret: input.keySecret,
        //   })
        //   .returning();
        // const createPayment = await db
        //   .insert(razorpay)
        //   .values({
        //     entity: findUser.entity.id,
        //     keyID: input.keyId,
        //     keySecret: input.keySecret,
        //   })
        //   .returning();
        // if (createPayment) {
        //   return {
        //     success: true,
        //   };
        // }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { paymentResolvers };

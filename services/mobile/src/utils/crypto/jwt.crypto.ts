import { GraphQLError } from "graphql";

const Cryptr = require("cryptr");
const cryptr = new Cryptr("myTotallySecretKey", {
  encoding: "base64",
  pbkdf2Iterations: 10,
  saltLength: 5,
});

const encryptToken = (data: string) => {
  const encrypted = cryptr.encrypt(`Bearer ${data}`);
  return encrypted;
};

const decryptToken = (data: string) => {
  try {
    const decrypted = cryptr.decrypt(data);
    return decrypted;
  } catch (error) {
    return null;
  }
};

export { encryptToken, decryptToken };

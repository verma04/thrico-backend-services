import * as dynamoose from "dynamoose";
const schema = new dynamoose.Schema({
  id: String,
  activeEntityId: { type: String, index: { name: "entitySessionIndex", type: "global" } }
});
const M = dynamoose.model("user_session", schema);
const q = M.query({ activeEntityId: { eq: "123" } }).using("entitySessionIndex");
console.log(q);

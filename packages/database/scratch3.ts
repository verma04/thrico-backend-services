import { USER_LOGIN_SESSION } from "./src/dynamodb/models/user";
const test = async () => {
    try {
        const entityId = null;
        const q = USER_LOGIN_SESSION.query("activeEntityId").eq(entityId).using("entitySessionIndex");
        console.log("Request:", await q.getRequest());
    } catch (e) {
        console.error("Error:", e);
    }
}
test();

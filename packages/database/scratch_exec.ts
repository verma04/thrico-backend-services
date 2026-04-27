import { USER_LOGIN_SESSION } from "./src/dynamodb/models/user";
const test = async () => {
    try {
        const entityId = "123";
        const q = USER_LOGIN_SESSION.query("activeEntityId").eq(entityId).using("entitySessionIndex").all();
        console.log("Request:", await q.getRequest());
        
        await q.exec();
    } catch (e) {
        console.error("Error executing query:", e);
    }
}
test();

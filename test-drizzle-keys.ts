import { moderationSettings } from "@thrico/database";
import { getTableColumns } from "drizzle-orm";
console.log(Object.keys(getTableColumns(moderationSettings)));

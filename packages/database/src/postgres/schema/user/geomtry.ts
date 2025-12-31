import { customType } from "drizzle-orm/pg-core";

export const geometry = customType<{
  data: string; // WKT (Well-Known Text) or GeoJSON string
}>({
  dataType() {
    return "geometry";
  },
});

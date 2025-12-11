import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts", // Path to your Drizzle schema
  dialect: "mysql",
  dbCredentials: {
    host: "15.206.156.197",     // or your EC2 private/public IP
    user: "satya",
    password: "satya123",
    database: "gmr_db", // replace with actual DB name
  },
});

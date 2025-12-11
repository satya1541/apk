import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "@shared/schema";

// Create connection function
async function createConnection() {
  try {
    const connection = await mysql.createConnection({
      host: "15.206.156.197",
      port: 3306,
      user: "satya",
      password: "satya123",
      database: "gmr_db",
    });
    console.log("Connected to MySQL database");
    return connection;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

// Initialize connection
const connection = await createConnection();

async function ensureOfflineEventsTable() {
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS device_offline_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        offline_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_offline_device_id (device_id),
        INDEX idx_offline_at (offline_at)
      )
    `);
  } catch (error) {
    console.error("Failed to ensure device_offline_events table exists:", error);
    throw error;
  }
}

await ensureOfflineEventsTable();

export const db = drizzle(connection, { schema, mode: "default" });
export { connection };

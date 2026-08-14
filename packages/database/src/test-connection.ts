import "dotenv/config";
import postgres from "postgres";


async function testConnection() {
  const databaseUrl = process.env.DATABASE_URL;
 
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = postgres(databaseUrl);

  try {
    const result = await sql`SELECT NOW() AS current_time`;

    console.log("DATABASE CONNECTION SUCCESSFUL");
    console.log(result[0]);
  } catch (error) {
    console.error("DATABASE CONNECTION FAILED");
    console.error(error);

    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

testConnection();
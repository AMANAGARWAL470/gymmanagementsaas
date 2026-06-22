// Diagnostic Script: List PostgreSQL public tables (Connection from environment)
const { Client } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

async function listTables() {
  const client = new Client({ connectionString });
  try {
    console.log("Connecting directly to PostgreSQL...");
    await client.connect();
    console.log("Connected successfully!");

    const res = await client.query(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
    );
    
    console.log(`Found ${res.rows.length} tables in public schema:`);
    res.rows.forEach(r => console.log(`- ${r.tablename}`));

  } catch (err) {
    console.error("Database connection error:", err.message);
  } finally {
    await client.end();
  }
}

listTables();

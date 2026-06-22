// Diagnostic Script: Check Supabase DB status (Keys from environment)
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || "https://hzpmhvydcothszxkdatb.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not defined.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log("Connecting to Supabase project...");
  
  // Test query on member_health_records
  const { data, error } = await supabase
    .from("member_health_records")
    .select("id")
    .limit(1);

  if (error) {
    console.log("Database query returned error:", error.message);
    
    // Check if other core tables exist (e.g. tenants)
    const { error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .limit(1);
      
    if (tenantError) {
      console.log("Result: The database is empty. No tables have been created yet.");
    } else {
      console.log("Result: Some tables exist, but member_health_records was missed.");
    }
  } else {
    console.log("Success: member_health_records table exists!");
  }
}

checkDatabase();

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const bucketName = "student-ktm";
  const { data: existingBucket } = await supabase.storage.getBucket(bucketName);

  if (!existingBucket) {
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      fileSizeLimit: "10MB",
    });

    if (error && !/already exists/i.test(error.message)) {
      throw error;
    }

    console.log(`Created private storage bucket: ${bucketName}`);
  } else {
    console.log(`Private storage bucket already exists: ${bucketName}`);
  }

  const { error: profilesError } = await supabase.from("profiles").select("wallet_address").limit(1);
  if (profilesError) {
    console.log("Database tables are not reachable yet.");
    console.log("Apply supabase/migrations/20260506000100_create_campusfi_verification.sql with MCP, Supabase SQL editor, or Supabase CLI db push.");
    return;
  }

  console.log("Database tables are reachable.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

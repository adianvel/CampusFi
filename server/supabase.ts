import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && serviceRoleKey);

export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl!, serviceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const studentKtmBucket = "student-ktm";

export type StudentVerificationInsert = {
  wallet_address: string;
  student_email: string;
  university_domain: string;
  ktm_file_path: string;
  ktm_file_name: string;
  credential_hash: string;
  ocr_text_preview: string;
  confidence: number;
  status: "verified" | "pending" | "rejected" | "failed";
  verified_at: string | null;
};

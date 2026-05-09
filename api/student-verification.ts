import type { SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null | undefined;

async function getSupabaseAdmin(): Promise<SupabaseClient | null> {
  if (_supabaseAdmin !== undefined) return _supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { _supabaseAdmin = null; return null; }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    _supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return _supabaseAdmin;
  } catch {
    _supabaseAdmin = null;
    return null;
  }
}

function applyCors(response: { setHeader?: (name: string, value: string) => void }) {
  response.setHeader?.("Access-Control-Allow-Credentials", "true");
  response.setHeader?.("Access-Control-Allow-Origin", "*");
  response.setHeader?.("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader?.("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(
  request: { query?: Record<string, string | string[] | undefined>; method?: string },
  response: {
    status: (code: number) => { json: (body: unknown) => void };
    setHeader?: (name: string, value: string) => void;
    json: (body: unknown) => void;
  },
) {
  applyCors(response);
  if (request.method === "OPTIONS") return response.status(204).json(null);
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed." });

  const walletAddress = getQueryValue(request.query?.walletAddress)?.trim() ?? "";
  if (!walletAddress) return response.status(400).json({ error: "Wallet address is required." });

  const supabaseAdmin = await getSupabaseAdmin();
  if (!supabaseAdmin) {
    return response.status(500).json({
      error: "Supabase is not configured on the backend.",
      code: "SUPABASE_ENV_MISSING",
    });
  }

  const { data, error } = await supabaseAdmin
    .from("student_verifications")
    .select("id,wallet_address,student_email,university_domain,ktm_file_name,credential_hash,ocr_text_preview,confidence,status,verified_at")
    .eq("wallet_address", walletAddress)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return response.status(500).json({ error: error.message, code: error.code ?? "SUPABASE_QUERY_FAILED" });
  }

  if (!data) return response.status(200).json({ status: "unverified" });

  const extracted = data.ocr_text_preview ? extractKtmFields(data.ocr_text_preview) : {};

  return response.status(200).json({
    id: data.id,
    status: data.status,
    walletAddress: data.wallet_address,
    email: data.student_email,
    universityDomain: data.university_domain,
    ktmFileName: data.ktm_file_name,
    credentialHash: data.credential_hash,
    confidence: data.confidence === null ? undefined : Number(data.confidence),
    ocrTextPreview: data.ocr_text_preview ?? undefined,
    verifiedAt: data.verified_at ?? undefined,
    ...extracted,
  });
}

function extractKtmFields(ocrText: string) {
  const nimPattern = /(nim|npm|no\.?\s*induk|nomor induk|student\s*id)\s*:?\s*(\d{8,15})/i;
  const standaloneNim = /\b(\d{9,12})\b/;
  const nimMatch = nimPattern.exec(ocrText);
  const looseNim = standaloneNim.exec(ocrText);
  const nim = nimMatch?.[2] ?? looseNim?.[1] ?? null;

  let university: string | null = null;
  const uniMatch = ocrText.match(/(?:universitas|institut|politeknik|sekolah tinggi|akademi)\s+[A-Za-z\s.]+/i);
  if (uniMatch) university = uniMatch[0].trim();

  let studentName: string | null = null;
  const nameMatch = ocrText.match(/(?:nama|name)\s*:?\s*([A-Za-z\s]{4,40})/i);
  if (nameMatch) studentName = nameMatch[1].trim();

  let major: string | null = null;
  const majorMatch = ocrText.match(/(?:program studi|prodi|jurusan|major)\s*:?\s*([A-Za-z\s.,&-]{4,60})/i);
  if (majorMatch) major = majorMatch[1].trim();

  return { studentName, nim, university, major };
}

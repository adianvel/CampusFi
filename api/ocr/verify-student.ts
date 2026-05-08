import crypto from "node:crypto";
import path from "node:path";
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

function parseJsonBody(body: unknown): VerifyStudentRequest {
  if (!body) return {};
  if (typeof body === "string") {
    try { return JSON.parse(body) as VerifyStudentRequest; } catch { return {}; }
  }
  return body as VerifyStudentRequest;
}

type VerifyStudentRequest = {
  email?: string; walletAddress?: string; fileName?: string;
  mimeType?: string; fileType?: 0 | 1; fileBase64?: string;
};

type PaddleOcrResponse = {
  result?: { layoutParsingResults?: Array<{ markdown?: { text?: string } }> };
};

type StudentVerificationInsert = {
  wallet_address: string; student_email: string; university_domain: string;
  ktm_file_path: string; ktm_file_name: string; credential_hash: string;
  ocr_text_preview: string; confidence: number;
  status: "verified" | "pending" | "rejected" | "failed"; verified_at: string | null;
};

const studentKtmBucket = "student-ktm";

export default async function handler(
  request: { body?: unknown; method?: string },
  response: {
    status: (code: number) => { json: (body: unknown) => void };
    setHeader?: (name: string, value: string) => void;
    json: (body: unknown) => void;
  },
) {
  applyCors(response);
  if (request.method === "OPTIONS") return response.status(204).json(null);
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });

  const payload = parseJsonBody(request.body);
  const email = payload.email?.trim().toLowerCase() ?? "";
  const walletAddress = payload.walletAddress?.trim() ?? "";

  if (!/^[^\s@]+@[^\s@]+\.ac\.id$/i.test(email)) {
    return response.status(400).json({ error: "Use a valid Indonesian student email ending in .ac.id." });
  }
  if (!walletAddress) {
    return response.status(400).json({ error: "Connect your wallet before verifying student status." });
  }
  if (!payload.fileBase64 || !payload.fileName || (payload.fileType !== 0 && payload.fileType !== 1)) {
    return response.status(400).json({ error: "Upload a KTM image or PDF file." });
  }

  const ocrApiUrl = process.env.PADDLEOCR_API_URL;
  const ocrToken = process.env.PADDLEOCR_TOKEN;
  if (!ocrApiUrl || !ocrToken) {
    return response.status(500).json({ error: "PaddleOCR is not configured on the backend.", code: "PADDLEOCR_ENV_MISSING" });
  }

  const supabaseAdmin = await getSupabaseAdmin();
  if (!supabaseAdmin) {
    return response.status(500).json({ error: "Supabase is not configured on the backend.", code: "SUPABASE_ENV_MISSING" });
  }

  try {
    await ensureBucket(supabaseAdmin);

    const fileBuffer = Buffer.from(payload.fileBase64, "base64");
    const filePath = createStoragePath(walletAddress, payload.fileName);
    const uploadResult = await supabaseAdmin.storage.from(studentKtmBucket).upload(filePath, fileBuffer, {
      contentType: payload.mimeType || (payload.fileType === 0 ? "application/pdf" : "image/jpeg"),
      upsert: false,
    });

    if (uploadResult.error) {
      return response.status(500).json({ error: uploadResult.error.message, code: "SUPABASE_STORAGE_UPLOAD_FAILED" });
    }

    const paddleResponse = await fetch(ocrApiUrl, {
      method: "POST",
      headers: { Authorization: `token ${ocrToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        file: payload.fileBase64,
        fileType: payload.fileType,
        useDocOrientationClassify: false,
        useDocUnwarping: false,
        useChartRecognition: false,
      }),
    });

    if (!paddleResponse.ok) {
      return response.status(502).json({ error: `PaddleOCR request failed with status ${paddleResponse.status}.` });
    }

    const data = (await paddleResponse.json()) as PaddleOcrResponse;
    const rawText = (data.result?.layoutParsingResults?.map((r) => r.markdown?.text ?? "").join("\n") ?? "").trim();
    const normalizedText = rawText.replace(/\s+/g, " ").trim();

    if (normalizedText.length < 12) {
      return response.status(422).json({ error: "OCR could not read enough KTM text. Upload a clearer image." });
    }

    const credentialHash = crypto.createHash("sha256").update(email).update(fileBuffer).digest("hex");
    const universityDomain = email.split("@")[1] ?? "";
    const confidence = estimateConfidence(normalizedText);
    const verifiedAt = new Date().toISOString();

    await supabaseAdmin.from("profiles").upsert(
      { wallet_address: walletAddress, role: "student", email, university: universityDomain.replace(".ac.id", "").toUpperCase(), verification_status: "verified" },
      { onConflict: "wallet_address" },
    );

    const verification: StudentVerificationInsert = {
      wallet_address: walletAddress, student_email: email, university_domain: universityDomain,
      ktm_file_path: filePath, ktm_file_name: payload.fileName, credential_hash: credentialHash,
      ocr_text_preview: normalizedText.slice(0, 240), confidence, status: "verified", verified_at: verifiedAt,
    };

    const insertResult = await supabaseAdmin.from("student_verifications").insert(verification).select("id").single();

    if (insertResult.error) {
      return response.status(500).json({ error: insertResult.error.message, code: insertResult.error.code ?? "SUPABASE_INSERT_FAILED" });
    }

    return response.status(200).json({
      id: insertResult.data.id, status: "verified", walletAddress, email, universityDomain,
      ktmFileName: payload.fileName, credentialHash, confidence,
      ocrTextPreview: normalizedText.slice(0, 240), verifiedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PaddleOCR verification failed.";
    return response.status(500).json({ error: message });
  }
}

async function ensureBucket(supabaseAdmin: SupabaseClient) {
  const { data } = await supabaseAdmin.storage.getBucket(studentKtmBucket);
  if (data) return;
  const { error } = await supabaseAdmin.storage.createBucket(studentKtmBucket, {
    public: false,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    fileSizeLimit: "10MB",
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

function createStoragePath(walletAddress: string, fileName: string) {
  const extension = path.extname(fileName).toLowerCase() || ".upload";
  const safeWallet = walletAddress.replace(/[^a-zA-Z0-9]/g, "");
  return `${safeWallet}/${Date.now()}-${crypto.randomUUID()}${extension}`;
}

function estimateConfidence(text: string) {
  const hasKeyword = /\b(mahasiswa|student|nim|npm|universitas|university|kartu tanda mahasiswa)\b/i.test(text);
  const hasDigits = /\d{5,}/.test(text);
  if (hasKeyword && hasDigits) return 0.9;
  if (hasKeyword || hasDigits) return 0.76;
  return 0.62;
}

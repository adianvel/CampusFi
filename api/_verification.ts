import crypto from "node:crypto";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null | undefined;

function getSupabaseAdmin(): SupabaseClient | null {
  if (_supabaseAdmin !== undefined) return _supabaseAdmin;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    _supabaseAdmin = null;
    return null;
  }

  try {
    _supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return _supabaseAdmin;
  } catch {
    _supabaseAdmin = null;
    return null;
  }
}

function hasSupabaseEnv() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const studentKtmBucket = "student-ktm";

type StudentVerificationInsert = {
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

export type VercelRequestLike = {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  method?: string;
};

export type VercelResponseLike = {
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

export type VerifyStudentRequest = {
  email?: string;
  walletAddress?: string;
  fileName?: string;
  mimeType?: string;
  fileType?: 0 | 1;
  fileBase64?: string;
};

type PaddleOcrResponse = {
  result?: {
    layoutParsingResults?: Array<{
      markdown?: {
        text?: string;
      };
    }>;
  };
};

export function applyCors(response: VercelResponseLike) {
  response.setHeader?.("Access-Control-Allow-Credentials", "true");
  response.setHeader?.("Access-Control-Allow-Origin", "*");
  response.setHeader?.("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader?.("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseJsonBody(body: unknown): VerifyStudentRequest {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as VerifyStudentRequest;
    } catch {
      return {};
    }
  }
  return body as VerifyStudentRequest;
}

export async function getVerifiedStudentByWallet(walletAddress: string) {
  if (!walletAddress) {
    return { status: 400, body: { error: "Wallet address is required." } };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    console.error("CampusFi verification restore failed: missing Supabase server env", {
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    return {
      status: 500,
      body: {
        error: "Supabase is not configured on the backend.",
        code: "SUPABASE_ENV_MISSING",
      },
    };
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
    console.error("CampusFi verification restore failed: Supabase query error", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      status: 500,
      body: {
        error: error.message,
        code: error.code ?? "SUPABASE_QUERY_FAILED",
        details: error.details ?? undefined,
        hint: error.hint ?? undefined,
      },
    };
  }

  if (!data) {
    return { status: 200, body: { status: "unverified" } };
  }

  return {
    status: 200,
    body: {
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
    },
  };
}

export async function verifyStudentCredentialRequest(payload: VerifyStudentRequest) {
  const normalizedEmail = payload.email?.trim().toLowerCase() ?? "";
  const normalizedWalletAddress = payload.walletAddress?.trim() ?? "";

  if (!/^[^\s@]+@[^\s@]+\.ac\.id$/i.test(normalizedEmail)) {
    return { status: 400, body: { error: "Use a valid Indonesian student email ending in .ac.id." } };
  }

  if (!normalizedWalletAddress) {
    return { status: 400, body: { error: "Connect your wallet before verifying student status." } };
  }

  if (!payload.fileBase64 || !payload.fileName || (payload.fileType !== 0 && payload.fileType !== 1)) {
    return { status: 400, body: { error: "Upload a KTM image or PDF file." } };
  }

  const apiUrl = process.env.PADDLEOCR_API_URL;
  const token = process.env.PADDLEOCR_TOKEN;

  if (!apiUrl || !token) {
    console.error("CampusFi verification failed: missing PaddleOCR server env", {
      hasPaddleOcrApiUrl: Boolean(process.env.PADDLEOCR_API_URL),
      hasPaddleOcrToken: Boolean(process.env.PADDLEOCR_TOKEN),
    });
    return {
      status: 500,
      body: {
        error: "PaddleOCR is not configured on the backend.",
        code: "PADDLEOCR_ENV_MISSING",
      },
    };
  }

  if (!hasSupabaseEnv() || !getSupabaseAdmin()) {
    console.error("CampusFi verification failed: missing Supabase server env", {
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    return {
      status: 500,
      body: {
        error: "Supabase is not configured on the backend.",
        code: "SUPABASE_ENV_MISSING",
      },
    };
  }

  const supabaseAdmin = getSupabaseAdmin()!;

  try {
    await ensureStudentKtmBucket(supabaseAdmin);

    const fileBuffer = Buffer.from(payload.fileBase64, "base64");
    const filePath = createKtmStoragePath(normalizedWalletAddress, payload.fileName);
    const uploadResult = await supabaseAdmin.storage.from(studentKtmBucket).upload(filePath, fileBuffer, {
      contentType: payload.mimeType || (payload.fileType === 0 ? "application/pdf" : "image/jpeg"),
      upsert: false,
    });

    if (uploadResult.error) {
      console.error("CampusFi verification failed: Supabase storage upload error", {
        message: uploadResult.error.message,
      });
      return {
        status: 500,
        body: {
          error: uploadResult.error.message,
          code: "SUPABASE_STORAGE_UPLOAD_FAILED",
        },
      };
    }

    const paddleResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: payload.fileBase64,
        fileType: payload.fileType,
        useDocOrientationClassify: false,
        useDocUnwarping: false,
        useChartRecognition: false,
      }),
    });

    if (!paddleResponse.ok) {
      return { status: 502, body: { error: `PaddleOCR request failed with status ${paddleResponse.status}.` } };
    }

    const data = (await paddleResponse.json()) as PaddleOcrResponse;
    const rawText = extractMarkdownText(data);
    const normalizedText = rawText.replace(/\s+/g, " ").trim();

    if (normalizedText.length < 12) {
      return { status: 422, body: { error: "OCR could not read enough KTM text. Upload a clearer image." } };
    }

    const credentialHash = crypto
      .createHash("sha256")
      .update(normalizedEmail)
      .update(fileBuffer)
      .digest("hex");
    const universityDomain = normalizedEmail.split("@")[1] ?? "";
    const confidence = estimateConfidence(normalizedText);
    const verifiedAt = new Date().toISOString();

    await upsertVerificationProfile({
      supabaseAdmin,
      walletAddress: normalizedWalletAddress,
      email: normalizedEmail,
      universityDomain,
    });

    const verification: StudentVerificationInsert = {
      wallet_address: normalizedWalletAddress,
      student_email: normalizedEmail,
      university_domain: universityDomain,
      ktm_file_path: filePath,
      ktm_file_name: payload.fileName,
      credential_hash: credentialHash,
      ocr_text_preview: normalizedText.slice(0, 240),
      confidence,
      status: "verified",
      verified_at: verifiedAt,
    };

    const insertResult = await supabaseAdmin.from("student_verifications").insert(verification).select("id").single();

    if (insertResult.error) {
      console.error("CampusFi verification failed: Supabase insert error", {
        message: insertResult.error.message,
        code: insertResult.error.code,
        details: insertResult.error.details,
        hint: insertResult.error.hint,
      });
      return {
        status: 500,
        body: {
          error: insertResult.error.message,
          code: insertResult.error.code ?? "SUPABASE_INSERT_FAILED",
          details: insertResult.error.details ?? undefined,
          hint: insertResult.error.hint ?? undefined,
        },
      };
    }

    return {
      status: 200,
      body: {
        id: insertResult.data.id,
        status: "verified",
        walletAddress: normalizedWalletAddress,
        email: normalizedEmail,
        universityDomain,
        ktmFileName: payload.fileName,
        credentialHash,
        confidence,
        ocrTextPreview: normalizedText.slice(0, 240),
        verifiedAt,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "PaddleOCR verification failed.";
    return { status: 500, body: { error: message } };
  }
}

function extractMarkdownText(data: PaddleOcrResponse) {
  return (
    data.result?.layoutParsingResults
      ?.map((result) => result.markdown?.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

async function ensureStudentKtmBucket(supabaseAdmin: SupabaseClient) {
  const { data } = await supabaseAdmin.storage.getBucket(studentKtmBucket);
  if (data) return;

  const { error } = await supabaseAdmin.storage.createBucket(studentKtmBucket, {
    public: false,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    fileSizeLimit: "10MB",
  });

  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

async function upsertVerificationProfile({
  supabaseAdmin,
  walletAddress,
  email,
  universityDomain,
}: {
  supabaseAdmin: SupabaseClient;
  walletAddress: string;
  email: string;
  universityDomain: string;
}) {
  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      wallet_address: walletAddress,
      role: "student",
      email,
      university: universityDomain.replace(".ac.id", "").toUpperCase(),
      verification_status: "verified",
    },
    { onConflict: "wallet_address" },
  );

  if (error) {
    throw error;
  }
}

function createKtmStoragePath(walletAddress: string, fileName: string) {
  const extension = path.extname(fileName).toLowerCase() || ".upload";
  const safeWallet = walletAddress.replace(/[^a-zA-Z0-9]/g, "");
  return `${safeWallet}/${Date.now()}-${crypto.randomUUID()}${extension}`;
}

function estimateConfidence(text: string) {
  const hasStudentKeyword = /\b(mahasiswa|student|nim|npm|universitas|university|kartu tanda mahasiswa)\b/i.test(text);
  const hasDigits = /\d{5,}/.test(text);

  if (hasStudentKeyword && hasDigits) return 0.9;
  if (hasStudentKeyword || hasDigits) return 0.76;
  return 0.62;
}

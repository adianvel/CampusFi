import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type { Server } from "node:http";
import { isSupabaseConfigured, studentKtmBucket, supabaseAdmin, type StudentVerificationInsert } from "./supabase";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isProduction = process.env.NODE_ENV === "production";
const preferredPort = Number(process.env.PORT || 3000);

const app = express();

app.use(express.json({ limit: "16mb" }));

type VerifyStudentRequest = {
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

app.get("/api/student-verification", async (request, response) => {
  const walletAddress = String(request.query.walletAddress ?? "").trim();

  if (!walletAddress) {
    return response.status(400).json({ error: "Wallet address is required." });
  }

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return response.status(500).json({ error: "Supabase is not configured on the backend." });
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
    return response.status(500).json({ error: error.message });
  }

  if (!data) {
    return response.json({ status: "unverified" });
  }

  return response.json({
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
  });
});

app.post("/api/ocr/verify-student", async (request, response) => {
  const { email, walletAddress, fileName, mimeType, fileType, fileBase64 } = request.body as VerifyStudentRequest;
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const normalizedWalletAddress = walletAddress?.trim() ?? "";

  if (!/^[^\s@]+@[^\s@]+\.ac\.id$/i.test(normalizedEmail)) {
    return response.status(400).json({ error: "Use a valid Indonesian student email ending in .ac.id." });
  }

  if (!normalizedWalletAddress) {
    return response.status(400).json({ error: "Connect your wallet before verifying student status." });
  }

  if (!fileBase64 || !fileName || (fileType !== 0 && fileType !== 1)) {
    return response.status(400).json({ error: "Upload a KTM image or PDF file." });
  }

  const apiUrl = process.env.PADDLEOCR_API_URL;
  const token = process.env.PADDLEOCR_TOKEN;

  if (!apiUrl || !token) {
    return response.status(500).json({ error: "PaddleOCR is not configured on the backend." });
  }

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return response.status(500).json({ error: "Supabase is not configured on the backend." });
  }

  try {
    await ensureStudentKtmBucket();

    const fileBuffer = Buffer.from(fileBase64, "base64");
    const filePath = createKtmStoragePath(normalizedWalletAddress, fileName);
    const uploadResult = await supabaseAdmin.storage.from(studentKtmBucket).upload(filePath, fileBuffer, {
      contentType: mimeType || (fileType === 0 ? "application/pdf" : "image/jpeg"),
      upsert: false,
    });

    if (uploadResult.error) {
      return response.status(500).json({ error: uploadResult.error.message });
    }

    const paddleResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: fileBase64,
        fileType,
        useDocOrientationClassify: false,
        useDocUnwarping: false,
        useChartRecognition: false,
      }),
    });

    if (!paddleResponse.ok) {
      return response.status(502).json({ error: `PaddleOCR request failed with status ${paddleResponse.status}.` });
    }

    const data = (await paddleResponse.json()) as PaddleOcrResponse;
    const rawText = extractMarkdownText(data);
    const normalizedText = rawText.replace(/\s+/g, " ").trim();

    if (normalizedText.length < 12) {
      return response.status(422).json({ error: "OCR could not read enough KTM text. Upload a clearer image." });
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
      walletAddress: normalizedWalletAddress,
      email: normalizedEmail,
      universityDomain,
    });

    const verification: StudentVerificationInsert = {
      wallet_address: normalizedWalletAddress,
      student_email: normalizedEmail,
      university_domain: universityDomain,
      ktm_file_path: filePath,
      ktm_file_name: fileName,
      credential_hash: credentialHash,
      ocr_text_preview: normalizedText.slice(0, 240),
      confidence,
      status: "verified",
      verified_at: verifiedAt,
    };

    const insertResult = await supabaseAdmin.from("student_verifications").insert(verification).select("id").single();

    if (insertResult.error) {
      return response.status(500).json({ error: insertResult.error.message });
    }

    return response.json({
      id: insertResult.data.id,
      status: "verified",
      walletAddress: normalizedWalletAddress,
      email: normalizedEmail,
      universityDomain,
      ktmFileName: fileName,
      credentialHash,
      confidence,
      ocrTextPreview: normalizedText.slice(0, 240),
      verifiedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PaddleOCR verification failed.";
    return response.status(500).json({ error: message });
  }
});

function extractMarkdownText(data: PaddleOcrResponse) {
  return (
    data.result?.layoutParsingResults
      ?.map((result) => result.markdown?.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

async function ensureStudentKtmBucket() {
  if (!supabaseAdmin) {
    throw new Error("Supabase is not configured on the backend.");
  }

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
  walletAddress,
  email,
  universityDomain,
}: {
  walletAddress: string;
  email: string;
  universityDomain: string;
}) {
  if (!supabaseAdmin) {
    throw new Error("Supabase is not configured on the backend.");
  }

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

if (isProduction) {
  const distPath = path.join(root, "dist");
  app.use(express.static(distPath));
  app.use("*", (_request, response) => {
    response.sendFile(path.join(distPath, "index.html"));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });

  app.use(vite.middlewares);
  app.use("*", async (request, response, next) => {
    try {
      const templatePath = path.join(root, "index.html");
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const html = await vite.transformIndexHtml(request.originalUrl, template);
      response.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

function listen(port: number) {
  const server: Server = app.listen(port, "0.0.0.0", () => {
    console.log(`CampusFi running at http://localhost:${port}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE" && port < preferredPort + 10) {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      listen(port + 1);
      return;
    }

    throw error;
  });
}

listen(preferredPort);

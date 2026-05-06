export type StudentVerificationStatus = "unverified" | "pending" | "verified" | "failed";

export type StudentVerification = {
  id?: string;
  status: StudentVerificationStatus;
  email: string;
  universityDomain: string;
  ktmFileName: string;
  credentialHash: string;
  confidence?: number;
  ocrTextPreview?: string;
  verifiedAt?: string;
};

export function loadStudentVerification(): StudentVerification | null {
  const raw = localStorage.getItem("campusfi.studentVerification");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StudentVerification;
  } catch {
    return null;
  }
}

export function saveStudentVerification(verification: StudentVerification) {
  localStorage.setItem("campusfi.studentVerification", JSON.stringify(verification));
}

export function isStudentEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.ac\.id$/i.test(email.trim());
}

export async function createCredentialHash(email: string, file: File) {
  const fileBytes = await file.arrayBuffer();
  const emailBytes = new TextEncoder().encode(email.trim().toLowerCase());
  const merged = new Uint8Array(emailBytes.byteLength + fileBytes.byteLength);
  merged.set(emailBytes, 0);
  merged.set(new Uint8Array(fileBytes), emailBytes.byteLength);

  const digest = await crypto.subtle.digest("SHA-256", merged);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyStudentCredential(email: string, ktmFile: File, walletAddress: string) {
  if (!isStudentEmail(email)) {
    throw new Error("Use a valid Indonesian student email ending in .ac.id.");
  }

  if (!walletAddress.trim()) {
    throw new Error("Connect your wallet before verifying student status.");
  }

  if (!ktmFile.type.startsWith("image/") && ktmFile.type !== "application/pdf") {
    throw new Error("Upload a KTM image or PDF file.");
  }

  const response = await fetch("/api/ocr/verify-student", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      walletAddress,
      fileName: ktmFile.name,
      mimeType: ktmFile.type,
      fileType: ktmFile.type === "application/pdf" ? 0 : 1,
      fileBase64: await fileToBase64(ktmFile),
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Student verification failed.");
  }

  return payload as StudentVerification;
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

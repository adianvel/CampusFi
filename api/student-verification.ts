import {
  applyCors,
  getQueryValue,
  getVerifiedStudentByWallet,
  type VercelRequestLike,
  type VercelResponseLike,
} from "./verification-utils";

export default async function handler(request: VercelRequestLike, response: VercelResponseLike) {
  applyCors(response);

  if (request.method === "OPTIONS") {
    return response.status(204).json(null);
  }

  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method not allowed." });
  }

  const walletAddress = getQueryValue(request.query?.walletAddress)?.trim() ?? "";
  const result = await getVerifiedStudentByWallet(walletAddress);
  return response.status(result.status).json(result.body);
}

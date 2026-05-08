import {
  applyCors,
  parseJsonBody,
  verifyStudentCredentialRequest,
  type VercelRequestLike,
  type VercelResponseLike,
} from "../verification-utils";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16mb",
    },
  },
};

export default async function handler(request: VercelRequestLike, response: VercelResponseLike) {
  applyCors(response);

  if (request.method === "OPTIONS") {
    return response.status(204).json(null);
  }

  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed." });
  }

  const result = await verifyStudentCredentialRequest(parseJsonBody(request.body));
  return response.status(result.status).json(result.body);
}

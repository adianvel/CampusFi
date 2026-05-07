import { applyCors, type VercelRequestLike, type VercelResponseLike } from "./_verification";

export default function handler(request: VercelRequestLike, response: VercelResponseLike) {
  applyCors(response);

  if (request.method === "OPTIONS") {
    return response.status(204).json(null);
  }

  return response.status(200).json({
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasPaddleOcrApiUrl: Boolean(process.env.PADDLEOCR_API_URL),
    hasPaddleOcrToken: Boolean(process.env.PADDLEOCR_TOKEN),
    nodeEnv: process.env.NODE_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}

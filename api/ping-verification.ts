import { applyCors, type VercelRequestLike, type VercelResponseLike } from "./_verification";

export default async function handler(request: VercelRequestLike, response: VercelResponseLike) {
  applyCors(response);
  return response.status(200).json({ ok: true, msg: "_verification module imported successfully" });
}

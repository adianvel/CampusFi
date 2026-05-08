import { applyCors, type VercelRequestLike, type VercelResponseLike } from "./verification-utils";

export default async function handler(request: VercelRequestLike, response: VercelResponseLike) {
  applyCors(response);
  return response.status(200).json({ ok: true, msg: "verification-utils module imported successfully" });
}

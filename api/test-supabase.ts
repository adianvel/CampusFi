export default async function handler(
  _request: { method?: string },
  response: {
    status: (code: number) => { json: (body: unknown) => void };
    setHeader: (name: string, value: string) => void;
    json: (body: unknown) => void;
  },
) {
  response.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const supabase = await import("@supabase/supabase-js");
    const client = supabase.createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await client
      .from("student_verifications")
      .select("id,status,student_email")
      .limit(1);

    if (error) {
      return response.status(500).json({ step: "query", error: error.message, code: error.code });
    }

    return response.status(200).json({
      ok: true,
      tableExists: true,
      rowCount: data.length,
      sample: data[0] ?? null,
    });
  } catch (err) {
    return response.status(500).json({
      ok: false,
      step: "import_or_init",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

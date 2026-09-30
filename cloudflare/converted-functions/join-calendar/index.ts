import { envGet } from "../_shared/env";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const __edgeHandler = (async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405, headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });

    const url = envGet("SUPABASE_URL")!;
    const anon = envGet("SUPABASE_ANON_KEY")!;
    const service = envGet("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{8,16}$/.test(code)) {
      return Response.json({ error: "invalid_share_code" }, { status: 400, headers: cors });
    }

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: calendar, error: calError } = await admin
      .from("calendar_spaces")
      .select("id,owner_id,name,kind")
      .eq("share_code", code)
      .maybeSingle();

    if (calError) throw calError;
    if (!calendar) return Response.json({ error: "calendar_not_found" }, { status: 404, headers: cors });
    if (calendar.owner_id === user.id) {
      return Response.json({ ok: true, calendar, role: "owner", already_joined: true }, { headers: cors });
    }

    const requestedRole = body?.role === "viewer" ? "viewer" : "editor";
    const { error: joinError } = await admin.from("calendar_space_members").upsert(
      { calendar_id: calendar.id, user_id: user.id, role: requestedRole },
      { onConflict: "calendar_id,user_id" }
    );
    if (joinError) throw joinError;

    return Response.json({ ok: true, calendar, role: requestedRole }, { headers: cors });
  } catch (e) {
    return Response.json({ error: "join_failed", detail: e instanceof Error ? e.message : String(e) }, { status: 500, headers: cors });
  }
});

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
    void env;
    void ctx;
    return await __edgeHandler(request);
  },
};

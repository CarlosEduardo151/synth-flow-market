// Bidirectional Google Calendar sync for sa_meetings
// Actions:
//   - push_meeting: creates/updates Google Calendar event from sa_meetings row
//   - pull_calendar: fetches events from Google and upserts into sa_meetings
//   - delete_meeting: removes from Google
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function refreshTokenIfNeeded(conn: any): Promise<string | null> {
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) return conn.access_token;
  if (!conn.refresh_token) return null;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    console.error("Token refresh failed", data);
    return null;
  }
  await admin
    .from("sa_calendar_connections")
    .update({
      access_token: data.access_token,
      token_expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
    })
    .eq("id", conn.id);
  return data.access_token as string;
}

async function getConnection(customerProductId: string) {
  const { data } = await admin
    .from("sa_calendar_connections")
    .select("*")
    .eq("customer_product_id", customerProductId)
    .eq("provider", "google")
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

async function pushMeeting(meetingId: string) {
  const { data: m } = await admin.from("sa_meetings").select("*").eq("id", meetingId).maybeSingle();
  if (!m) throw new Error("Meeting not found");
  const conn = await getConnection(m.customer_product_id);
  if (!conn) throw new Error("Google Calendar not connected");
  const token = await refreshTokenIfNeeded(conn);
  if (!token) throw new Error("Token refresh failed");

  const calendarId = conn.calendar_id || "primary";
  const start = new Date(m.scheduled_at);
  const end = new Date(start.getTime() + (m.duration_min || 30) * 60000);

  const event = {
    summary: m.title || "Reunião",
    description: m.notes || m.description || "",
    start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
    attendees: m.lead_email ? [{ email: m.lead_email }] : [],
    conferenceData: m.meeting_url
      ? undefined
      : {
          createRequest: {
            requestId: `crm-${m.id}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 60 },
      ],
    },
  };

  const isUpdate = !!m.google_event_id;
  const url = isUpdate
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(m.google_event_id)}?conferenceDataVersion=1&sendUpdates=all`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`;

  const r = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  const result = await r.json();
  if (!r.ok) {
    console.error("Google API error", r.status, result);
    throw new Error(`google_api_error:${r.status}`);
  }

  const meetUrl = result.hangoutLink || result.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri;
  await admin
    .from("sa_meetings")
    .update({
      google_event_id: result.id,
      google_calendar_id: calendarId,
      meeting_url: meetUrl || m.meeting_url,
      google_synced_at: new Date().toISOString(),
    })
    .eq("id", m.id);

  return { event_id: result.id, meeting_url: meetUrl };
}

async function deleteMeeting(meetingId: string) {
  const { data: m } = await admin.from("sa_meetings").select("*").eq("id", meetingId).maybeSingle();
  if (!m || !m.google_event_id) return { ok: true, skipped: true };
  const conn = await getConnection(m.customer_product_id);
  if (!conn) return { ok: false, error: "no_connection" };
  const token = await refreshTokenIfNeeded(conn);
  if (!token) return { ok: false, error: "token_refresh_failed" };

  const calendarId = m.google_calendar_id || conn.calendar_id || "primary";
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(m.google_event_id)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  await admin.from("sa_meetings").update({ deleted_in_google: true }).eq("id", m.id);
  return { ok: true };
}

async function pullCalendar(customerProductId: string) {
  const conn = await getConnection(customerProductId);
  if (!conn) throw new Error("Google Calendar not connected");
  const token = await refreshTokenIfNeeded(conn);
  if (!token) throw new Error("Token refresh failed");

  const calendarId = conn.calendar_id || "primary";
  const timeMin = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();

  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`google_api_error:${r.status}:${t.slice(0, 200)}`);
  }
  const data = await r.json();
  const events = data.items || [];

  let imported = 0;
  let updated = 0;

  for (const ev of events) {
    if (!ev.start?.dateTime) continue; // skip all-day events
    const status = ev.status === "cancelled" ? "cancelled" : "scheduled";

    const { data: existing } = await admin
      .from("sa_meetings")
      .select("id")
      .eq("google_event_id", ev.id)
      .maybeSingle();

    const payload = {
      customer_product_id: customerProductId,
      title: ev.summary || "Sem título",
      notes: ev.description || null,
      lead_email: ev.attendees?.find((a: any) => !a.organizer)?.email || null,
      scheduled_at: new Date(ev.start.dateTime).toISOString(),
      duration_min: ev.end?.dateTime
        ? Math.round((new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime).getTime()) / 60000)
        : 30,
      meeting_url: ev.hangoutLink || ev.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri || null,
      status,
      source: "google_calendar",
      google_event_id: ev.id,
      google_calendar_id: calendarId,
      google_synced_at: new Date().toISOString(),
    };

    if (existing) {
      await admin.from("sa_meetings").update(payload).eq("id", existing.id);
      updated++;
    } else {
      await admin.from("sa_meetings").insert(payload);
      imported++;
    }
  }

  await admin
    .from("sa_calendar_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", conn.id);

  return { imported, updated, total: events.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, meeting_id, customer_product_id } = await req.json();

    if (action === "push_meeting" && meeting_id) {
      const result = await pushMeeting(meeting_id);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "delete_meeting" && meeting_id) {
      const result = await deleteMeeting(meeting_id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "pull_calendar" && customer_product_id) {
      const result = await pullCalendar(customer_product_id);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sa-google-calendar-sync error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

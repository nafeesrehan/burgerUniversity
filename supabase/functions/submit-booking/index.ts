// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { token, booking } = await req.json();

    // 1. Ask Cloudflare: is this a real human?
    const form = new FormData();
    form.append("secret", Deno.env.get("TURNSTILE_SECRET")!);
    form.append("response", token);
    const check = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
    const result = await check.json();
    if (!result.success) return reply({ error: "Spam check failed" }, 400);

    // 2. Save to the database. Pick fields one by one, never trust the whole object.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.from("table_bookings").insert({
      name: booking.name,
      phone: booking.phone,
      email: booking.email,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      party_size: booking.party_size,
    });
    if (error) return reply({ error: error.message }, 400);

    // 3. Send email notification via Resend
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Burger University <onboarding@resend.dev>",
            to: ["ansarinafees7306@gmail.com"],
            subject: `New booking: ${booking.name}`,
            text: `${booking.name} booked for ${booking.party_size} guest(s) on ${booking.booking_date} at ${booking.booking_time}. Contact: ${booking.phone} / ${booking.email}`,
          }),
        });
      } else {
        console.warn("RESEND_API_KEY secret not found in environment, skipping email.");
      }
    } catch (e) {
      console.error("Email notification failed:", e);
    }

    return reply({ ok: true });
  } catch (_e) {
    return reply({ error: "Something went wrong" }, 500);
  }
});

console.log("Hello from Functions!");

// This endpoint uses 'publishable' | 'secret' access, apiKey is required.
// Use publishable for Client-facing, key-validated endpoints
// Use secret for Server-to-server, internal calls
export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    // Called by another service with a secret key
    // ctx.supabaseAdmin bypasses RLS — use for privileged operations
    /*
    if (ctx.authMode === "secret") {
      const { user_id } = await req.json();
      const { data } = await ctx.supabaseAdmin.auth.admin.getUserById(user_id);

      return Response.json({
        email: data?.user?.email,
      });
    }
    */

    const { name } = await req.json();

    return Response.json({
      message: `Hello ${name}!`,
    });
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/submit-booking' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"name":"Functions"}'

*/

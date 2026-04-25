import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateWarband } from "../_shared/units.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization");
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader?.replace("Bearer ", "") ?? ""
  );
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  // Generate a unique room code
  let roomCode = randomCode();
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase.from("games").select("id").eq("room_code", roomCode).single();
    if (!data) break;
    roomCode = randomCode();
  }

  // Insert game row
  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({ room_code: roomCode, player0_id: user.id })
    .select()
    .single();

  if (gameError) {
    return new Response(JSON.stringify({ error: gameError.message }), { status: 500, headers: corsHeaders });
  }

  // Generate 3 invite tokens
  const invites = [1, 2, 3].map((slot) => ({
    token: randomToken(),
    game_id: game.id,
    slot,
  }));

  const { error: inviteError } = await supabase.from("invites").insert(invites);
  if (inviteError) {
    return new Response(JSON.stringify({ error: inviteError.message }), { status: 500, headers: corsHeaders });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:5173";
  const inviteUrls = invites.map((inv) => `${origin}/join?token=${inv.token}`);

  return new Response(
    JSON.stringify({ gameId: game.id, roomCode, inviteUrls }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

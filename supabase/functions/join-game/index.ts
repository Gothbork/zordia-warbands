import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateWarband } from "../_shared/units.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLOT_COLUMN: Record<number, string> = {
  1: "player1_id",
  2: "player2_id",
  3: "player3_id",
};

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

  const { token } = await req.json();
  if (!token) {
    return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: corsHeaders });
  }

  // Fetch and validate invite
  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("*, games(*)")
    .eq("token", token)
    .single();

  if (inviteError || !invite) {
    return new Response(JSON.stringify({ error: "Invalid invite" }), { status: 404, headers: corsHeaders });
  }
  if (invite.used) {
    return new Response(JSON.stringify({ error: "Invite already used" }), { status: 409, headers: corsHeaders });
  }
  if (invite.games.phase !== "waiting") {
    return new Response(JSON.stringify({ error: "Game already started" }), { status: 409, headers: corsHeaders });
  }

  const slot: number = invite.slot;
  const gameId: string = invite.game_id;

  // Mark invite used and assign player slot
  await supabase.from("invites").update({ used: true }).eq("token", token);
  await supabase.from("games").update({ [SLOT_COLUMN[slot]]: user.id }).eq("id", gameId);

  // Check if all 4 players have joined
  const { data: game } = await supabase.from("games").select("*").eq("id", gameId).single();
  const allJoined = game.player0_id && game.player1_id && game.player2_id && game.player3_id;

  if (allJoined) {
    // Generate warbands for all 4 players
    const allUnits = [0, 1, 2, 3].flatMap((owner) =>
      generateWarband(owner).map((u) => ({ ...u, game_id: gameId }))
    );
    await supabase.from("units").insert(allUnits);

    // Randomly pick who goes first
    const firstTurn = Math.floor(Math.random() * 4);
    await supabase.from("games").update({ phase: "battle", current_turn: firstTurn }).eq("id", gameId);
  }

  return new Response(
    JSON.stringify({ gameId, slot, started: !!allJoined }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

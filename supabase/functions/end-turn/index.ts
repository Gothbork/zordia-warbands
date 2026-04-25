import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPlayerIndex } from "../_shared/game.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const { gameId } = await req.json();

  const { data: game } = await supabase.from("games").select("*").eq("id", gameId).single();

  if (!game || game.phase !== "battle") {
    return new Response(JSON.stringify({ error: "Game not in battle" }), { status: 400, headers: corsHeaders });
  }

  const playerIndex = getPlayerIndex(game, user.id);
  if (playerIndex === -1 || game.current_turn !== playerIndex) {
    return new Response(JSON.stringify({ error: "Not your turn" }), { status: 403, headers: corsHeaders });
  }

  // Reset moved/attacked for current player's units
  await supabase
    .from("units")
    .update({ moved: false, attacked: false })
    .eq("game_id", gameId)
    .eq("owner", playerIndex);

  // Advance to next non-eliminated player
  const eliminated: number[] = game.eliminated ?? [];
  let next = (playerIndex + 1) % 4;
  for (let i = 0; i < 4; i++) {
    if (!eliminated.includes(next)) break;
    next = (next + 1) % 4;
  }

  await supabase.from("games").update({ current_turn: next }).eq("id", gameId);

  return new Response(JSON.stringify({ ok: true, nextTurn: next }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

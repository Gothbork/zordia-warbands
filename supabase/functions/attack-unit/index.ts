import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chebyshev, getPlayerIndex, getAttackRange, getDamage } from "../_shared/game.ts";
import { UnitType } from "../_shared/units.ts";

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

  const { gameId, unitId, targetId } = await req.json();

  const [{ data: game }, { data: units }] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase.from("units").select("*").eq("game_id", gameId),
  ]);

  if (!game || game.phase !== "battle") {
    return new Response(JSON.stringify({ error: "Game not in battle" }), { status: 400, headers: corsHeaders });
  }

  const playerIndex = getPlayerIndex(game, user.id);
  if (playerIndex === -1 || game.current_turn !== playerIndex) {
    return new Response(JSON.stringify({ error: "Not your turn" }), { status: 403, headers: corsHeaders });
  }

  const attacker = units?.find((u: { id: string }) => u.id === unitId);
  const target = units?.find((u: { id: string }) => u.id === targetId);

  if (!attacker || attacker.owner !== playerIndex) {
    return new Response(JSON.stringify({ error: "Invalid attacker" }), { status: 400, headers: corsHeaders });
  }
  if (!target || target.owner === playerIndex) {
    return new Response(JSON.stringify({ error: "Invalid target" }), { status: 400, headers: corsHeaders });
  }
  if (attacker.attacked) {
    return new Response(JSON.stringify({ error: "Unit already attacked" }), { status: 400, headers: corsHeaders });
  }

  const dist = chebyshev(attacker.x, attacker.y, target.x, target.y);
  if (dist > getAttackRange(attacker.type as UnitType)) {
    return new Response(JSON.stringify({ error: "Target out of range" }), { status: 400, headers: corsHeaders });
  }

  const damage = getDamage(attacker.type as UnitType);
  const newHp = target.hp - damage;

  // Mark attacker as having attacked
  await supabase.from("units").update({ attacked: true }).eq("id", unitId);

  let killed = false;
  if (newHp <= 0) {
    await supabase.from("units").delete().eq("id", targetId);
    killed = true;
  } else {
    await supabase.from("units").update({ hp: newHp }).eq("id", targetId);
  }

  // Check if target's owner is eliminated (no units left)
  let winner: number | null = null;
  let eliminated: number[] = game.eliminated ?? [];

  if (killed && !eliminated.includes(target.owner)) {
    const { data: remaining } = await supabase
      .from("units")
      .select("id")
      .eq("game_id", gameId)
      .eq("owner", target.owner);

    if (!remaining || remaining.length === 0) {
      eliminated = [...eliminated, target.owner];
      const survivors = [0, 1, 2, 3].filter((p) => !eliminated.includes(p));
      if (survivors.length === 1) winner = survivors[0];

      const update: Record<string, unknown> = { eliminated };
      if (winner !== null) update.phase = "ended";
      if (winner !== null) update.winner = winner;
      await supabase.from("games").update(update).eq("id", gameId);
    }
  }

  return new Response(JSON.stringify({ ok: true, killed, winner }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

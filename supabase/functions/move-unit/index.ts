import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { reachableCells, getPlayerIndex, getMoveRange } from "../_shared/game.ts";
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

  const { gameId, unitId, toX, toY } = await req.json();

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

  const unit = units?.find((u: { id: string }) => u.id === unitId);
  if (!unit || unit.owner !== playerIndex) {
    return new Response(JSON.stringify({ error: "Invalid unit" }), { status: 400, headers: corsHeaders });
  }
  if (unit.moved) {
    return new Response(JSON.stringify({ error: "Unit already moved" }), { status: 400, headers: corsHeaders });
  }

  const occupied = new Set(
    (units ?? []).filter((u: { id: string }) => u.id !== unitId).map((u: { x: number; y: number }) => `${u.x},${u.y}`)
  );
  const reachable = reachableCells(unit.x, unit.y, getMoveRange(unit.type as UnitType), occupied);
  const canMove = reachable.some(([x, y]) => x === toX && y === toY);

  if (!canMove) {
    return new Response(JSON.stringify({ error: "Cell not reachable" }), { status: 400, headers: corsHeaders });
  }

  await supabase.from("units").update({ x: toX, y: toY, moved: true }).eq("id", unitId);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

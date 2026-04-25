import { writable, derived } from "svelte/store";
import { supabase } from "./supabase.js";

export const session = writable(null);
export const game = writable(null);
export const units = writable([]);
export const mySlot = writable(null); // 0-3

// Which unit the current player has selected
export const selectedUnitId = writable(null);
// 'move' | 'attack' | null
export const actionMode = writable(null);

export const selectedUnit = derived(
  [selectedUnitId, units],
  ([$id, $units]) => $units.find((u) => u.id === $id) ?? null
);

export const isMyTurn = derived(
  [game, mySlot],
  ([$game, $slot]) => $game?.phase === "battle" && $game?.current_turn === $slot
);

let gameChannel = null;
let unitsChannel = null;

export function subscribeToGame(gameId) {
  gameChannel?.unsubscribe();
  unitsChannel?.unsubscribe();

  gameChannel = supabase
    .channel(`game:${gameId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
      (payload) => game.set(payload.new)
    )
    .subscribe();

  unitsChannel = supabase
    .channel(`units:${gameId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "units", filter: `game_id=eq.${gameId}` },
      (payload) => units.update((u) => [...u, payload.new])
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "units", filter: `game_id=eq.${gameId}` },
      (payload) => units.update((u) => u.map((unit) => unit.id === payload.new.id ? payload.new : unit))
    )
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "units", filter: `game_id=eq.${gameId}` },
      (payload) => units.update((u) => u.filter((unit) => unit.id !== payload.old.id))
    )
    .subscribe();
}

export async function loadGame(gameId) {
  const [{ data: g }, { data: u }] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase.from("units").select("*").eq("game_id", gameId),
  ]);
  game.set(g);
  units.set(u ?? []);
  subscribeToGame(gameId);
}

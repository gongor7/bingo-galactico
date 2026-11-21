import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Single broadcast channel per room. All game traffic flows through the
 * `msg` broadcast event with a discriminated-union payload (see game/types).
 */
export function roomChannel(sb: SupabaseClient, code: string, presenceKey: string): RealtimeChannel {
  return sb.channel(`room:${code}`, {
    config: {
      broadcast: { self: false },
      presence: { key: presenceKey },
    },
  });
}

export function sendHost(channel: RealtimeChannel, event: object): void {
  void channel.send({ type: "broadcast", event: "msg", payload: event });
}

export function sendPlayer(channel: RealtimeChannel, event: object): void {
  void channel.send({ type: "broadcast", event: "msg", payload: event });
}
